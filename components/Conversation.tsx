"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Recorder } from "./Recorder";
import { Toolbar } from "./conversation/Toolbar";
import { TurnList, type Turn } from "./conversation/TurnList";
import { analyze, ClientRateLimitError } from "@/lib/client";
import { OPENER } from "@/lib/opener";
import {
  clearConversation,
  loadAutoSpeak,
  loadConversation,
  saveAutoSpeak,
  saveConversation,
  type StoredTurn,
} from "@/lib/storage";
import type { HistoryTurn } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";

const INITIAL_TURNS: Turn[] = [
  { kind: "bot", text: OPENER.text, scaffolding: OPENER.scaffolding },
];

const RATE_LIMIT_LOCK_MS = 10_000;

function toStoredTurns(turns: Turn[]): StoredTurn[] {
  return turns.map((turn) =>
    turn.kind === "user"
      ? { kind: "user", text: turn.text, analysis: turn.analysis }
      : { kind: "bot", text: turn.text, scaffolding: turn.scaffolding },
  );
}

function findRepeatableTurn(
  turns: Turn[],
): { index: number; expression: string } | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.kind !== "user") {
      continue;
    }
    const raw = turn.analysis.raw_transcript.trim().toLowerCase();
    const better = turn.analysis.better_expression.trim().toLowerCase();
    if (raw !== better) {
      return { index: i, expression: turn.analysis.better_expression };
    }
    return null;
  }
  return null;
}

export function Conversation() {
  const [turns, setTurns] = useState<Turn[]>(INITIAL_TURNS);
  const [restoredCount, setRestoredCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [repeatTarget, setRepeatTarget] = useState<string | null>(null);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak, cancel } = useSpeech();

  /* Hydrating from localStorage must happen after mount to keep SSR output stable. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = loadConversation();
    if (stored) {
      setTurns(stored);
      setRestoredCount(stored.length);
    }
    setAutoSpeak(loadAutoSpeak());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveConversation(toStoredTurns(turns));
  }, [turns, hydrated]);

  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
    };
  }, []);

  const toggleAutoSpeak = () => {
    setAutoSpeak((prev) => {
      const next = !prev;
      saveAutoSpeak(next);
      if (!next) {
        cancel();
      }
      return next;
    });
  };

  const newConversation = () => {
    cancel();
    clearConversation();
    setTurns(INITIAL_TURNS);
    setRestoredCount(0);
    setStatus(null);
    setRepeatTarget(null);
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    setLocked(false);
  };

  const repeatable = findRepeatableTurn(turns);

  const handleRepeat = () => {
    if (repeatable) {
      setRepeatTarget(repeatable.expression);
    }
  };

  const handleUserAudio = useCallback(
    async (blob: Blob) => {
      setSending(true);
      setStatus(null);
      try {
        const history: HistoryTurn[] = turns.map((turn) => ({
          role: turn.kind,
          text: turn.text,
        }));
        const result = await analyze(blob, history, repeatTarget ?? undefined);
        const isRepeat = repeatTarget !== null;
        setRepeatTarget(null);
        setTurns((prev) => [
          ...prev,
          {
            kind: "user",
            text: result.user_analysis.raw_transcript,
            analysis: result.user_analysis,
            blob,
            repeat: isRepeat,
          },
          {
            kind: "bot",
            text: result.bot_reply.text,
            scaffolding: result.bot_reply.hidden_scaffolding,
          },
        ]);
        if (autoSpeak) {
          speak(result.bot_reply.text);
        }
      } catch (error) {
        if (error instanceof ClientRateLimitError) {
          setStatus("Bạn nói nhanh quá, đợi vài giây rồi thử lại");
          setLocked(true);
          if (lockTimeoutRef.current) {
            clearTimeout(lockTimeoutRef.current);
          }
          lockTimeoutRef.current = setTimeout(() => {
            lockTimeoutRef.current = null;
            setLocked(false);
          }, RATE_LIMIT_LOCK_MS);
        } else {
          setStatus("Mình chưa xử lý được bản ghi này. Bạn thử lại nhé.");
        }
      } finally {
        setSending(false);
      }
    },
    [turns, autoSpeak, speak, repeatTarget],
  );

  const recorderDisabled = sending || locked;
  const recorderDisabledReason = locked
    ? "Đợi vài giây rồi thử lại nhé"
    : sending
      ? "Đang xử lý..."
      : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Toolbar
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={toggleAutoSpeak}
        onNewConversation={newConversation}
      />

      <TurnList
        turns={turns}
        restoredCount={restoredCount}
        repeatableIndex={repeatable?.index ?? null}
        onRepeat={repeatable ? handleRepeat : undefined}
      />

      {sending && (
        <p data-testid="sending-indicator" className="text-center text-sm text-zinc-500">
          Đang xử lý...
        </p>
      )}
      {status && (
        <p
          data-testid="status-message"
          role="status"
          className="text-center text-sm text-amber-700"
        >
          {status}
        </p>
      )}

      {repeatTarget && (
        <div
          data-testid="repeat-banner"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2"
        >
          <p className="text-sm text-teal-900">
            <span className="font-semibold">Repeat:</span> {repeatTarget}
          </p>
          <button
            type="button"
            data-testid="cancel-repeat-button"
            onClick={() => setRepeatTarget(null)}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100"
          >
            Cancel
          </button>
        </div>
      )}

      <Recorder
        onComplete={handleUserAudio}
        disabled={recorderDisabled}
        disabledReason={recorderDisabledReason}
      />
    </div>
  );
}
