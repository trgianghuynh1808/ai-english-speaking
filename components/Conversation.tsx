"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FeedbackCard } from "./FeedbackCard";
import { Recorder } from "./Recorder";
import { ScaffoldingBox } from "./ScaffoldingBox";
import { analyze, ClientRateLimitError } from "@/lib/client";
import { OPENER } from "@/lib/opener";
import type { AnalyzeResponse, HistoryTurn } from "@/lib/types";

type Turn =
  | { kind: "user"; text: string; analysis: AnalyzeResponse["user_analysis"] }
  | {
      kind: "bot";
      text: string;
      scaffolding: { ideas: string[]; sentence_starters: string[] };
    };

const INITIAL_TURNS: Turn[] = [
  { kind: "bot", text: OPENER.text, scaffolding: OPENER.scaffolding },
];

const RATE_LIMIT_LOCK_MS = 10_000;

export function Conversation() {
  const [turns, setTurns] = useState<Turn[]>(INITIAL_TURNS);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

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
          },
          {
            kind: "bot",
            text: result.bot_reply.text,
            scaffolding: result.bot_reply.hidden_scaffolding,
          },
        ]);
      } catch (error) {
        if (error instanceof ClientRateLimitError) {
          setStatus("Bạn nói nhanh quá, đợi vài giây rồi thử lại");
          setLocked(true);
          setTimeout(() => setLocked(false), RATE_LIMIT_LOCK_MS);
        } else {
          setStatus("Mình chưa xử lý được bản ghi này. Bạn thử lại nhé.");
        }
      } finally {
        setSending(false);
      }
    },
    [turns],
  );

  const recorderDisabled = sending || locked;
  const recorderDisabledReason = locked
    ? "Đợi vài giây rồi thử lại nhé"
    : sending
      ? "Đang xử lý..."
      : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        data-testid="conversation"
        className="max-h-[60vh] flex-1 space-y-4 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4"
      >
        {turns.map((turn, index) =>
          turn.kind === "user" ? (
            <div key={index} className="flex flex-col items-end gap-2">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-teal-600 px-4 py-2 text-white shadow-sm">
                {turn.text}
              </div>
              <FeedbackCard analysis={turn.analysis} />
            </div>
          ) : (
            <div key={index} className="flex flex-col items-start gap-2">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-zinc-800 shadow-sm ring-1 ring-zinc-200">
                {turn.text}
              </div>
              <ScaffoldingBox
                ideas={turn.scaffolding.ideas}
                sentence_starters={turn.scaffolding.sentence_starters}
                turnKey={index}
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
