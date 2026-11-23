"use client";

import { useEffect, useRef } from "react";
import { FeedbackCard } from "../FeedbackCard";
import { PlayRecording } from "../PlayRecording";
import { ScaffoldingBox } from "../ScaffoldingBox";
import { SpeakButton } from "../SpeakButton";
import type { AnalyzeResponse } from "@/lib/types";

export type Turn =
  | {
      kind: "user";
      text: string;
      analysis: AnalyzeResponse["user_analysis"];
      blob?: Blob;
      repeat?: boolean;
    }
  | {
      kind: "bot";
      text: string;
      scaffolding: { ideas: string[]; sentence_starters: string[] };
    };

interface TurnListProps {
  turns: Turn[];
  restoredCount: number;
  repeatableIndex: number | null;
  onRepeat?: () => void;
}

export function TurnList({
  turns,
  restoredCount,
  repeatableIndex,
  onRepeat,
}: TurnListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  return (
    <div
      data-testid="conversation"
      className="max-h-[60vh] flex-1 space-y-4 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4"
    >
      {turns.map((turn, index) =>
        turn.kind === "user" ? (
          <div key={index} className="flex flex-col items-end gap-2">
            {turn.repeat && (
              <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Repeat attempt
              </span>
            )}
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-teal-600 px-4 py-2 text-white shadow-sm">
              <p>{turn.text}</p>
              {turn.blob && (
                <div className="mt-2 flex justify-end">
                  <PlayRecording blob={turn.blob} />
                </div>
              )}
            </div>
            <FeedbackCard
              analysis={turn.analysis}
              onRepeat={index === repeatableIndex ? onRepeat : undefined}
            />
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
  );
}
