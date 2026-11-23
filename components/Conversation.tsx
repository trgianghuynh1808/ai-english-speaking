"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FeedbackCard } from "./FeedbackCard";
import { PlayRecording } from "./PlayRecording";
import { Recorder } from "./Recorder";
import { ScaffoldingBox } from "./ScaffoldingBox";
import { SpeakButton } from "./SpeakButton";
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
import type { AnalyzeResponse, HistoryTurn } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";

type Turn =
  | {
      kind: "user";
      text: string;
      analysis: AnalyzeResponse["user_analysis"];
      blob?: Blob;
    }
  | {
      kind: "bot";
      text: string;
      scaffolding: { ideas: string[]; sentence_starters: string[] };
    };

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

export function Conversation() {
  const [turns, setTurns] = useState<Turn[]>(INITIAL_TURNS);
  const [restoredCount, setRestoredCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak, cancel } = useSpeech();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

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
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    setLocked(false);
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
        const result = await analyze(blob, history);
        setTurns((prev) => [
          ...prev,
          {
            kind: "user",
            text: result.user_analysis.raw_transcript,
            analysis: result.user_analysis,
            blob,
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
    [turns, autoSpeak, speak],
  );

  const recorderDisabled = sending || locked;
  const recorderDisabledReason = locked
    ? "Đợi vài giây rồi thử lại nhé"
    : sending
      ? "Đang xử lý..."
      : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          data-testid="auto-speak-toggle"
          aria-pressed={autoSpeak}
          onClick={toggleAutoSpeak}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm ring-1 transition-colors ${
            autoSpeak
              ? "bg-teal-600 text-white ring-teal-600 hover:bg-teal-700"
              : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-100"
          }`}
        >
          {autoSpeak ? (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <VolumeX className="h-4 w-4" aria-hidden="true" />
          )}
          Auto-speak {autoSpeak ? "on" : "off"}
        </button>
        <button
          type="button"
          data-testid="new-conversation"
          onClick={newConversation}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100"
        >
          New conversation
        </button>
      </div>

      <div
        data-testid="conversation"
        className="max-h-[60vh] flex-1 space-y-4 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4"
      >
        {turns.map((turn, index) =>
          turn.kind === "user" ? (
            <div key={index} className="flex flex-col items-end gap-2">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-teal-600 px-4 py-2 text-white shadow-sm">
                <p>{turn.text}</p>
                {turn.blob && (
                  <div className="mt-2 flex justify-end">
                    <PlayRecording blob={turn.blob} />
                  </div>
                )}
              </div>
              <FeedbackCard analysis={turn.analysis} />
            </div>
          ) : (
            <div key={index} className="flex flex-col items-start gap-2">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-zinc-800 shadow-sm ring-1 ring-zinc-200">
                <p>{turn.text}</p>
                <div className="mt-2">
                  <SpeakButton text={turn.text} />
                </div>
              </div>
              <ScaffoldingBox
                ideas={turn.scaffolding.ideas}
                sentence_starters={turn.scaffolding.sentence_starters}
                turnKey={index}
                defaultRevealed={index < restoredCount}
              />
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

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

      <Recorder
        onComplete={handleUserAudio}
        disabled={recorderDisabled}
        disabledReason={recorderDisabledReason}
      />
    </div>
  );
}
