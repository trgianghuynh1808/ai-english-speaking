"use client";

import { useEffect, useRef } from "react";
import { PlayRecording } from "../PlayRecording";
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

interface ChatThreadProps {
  turns: Turn[];
  selectedIndex: number | null;
  onSelectUser: (index: number) => void;
}

export function ChatThread({
  turns,
  selectedIndex,
  onSelectUser,
}: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  let latestUserIndex: number | null = null;
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    if (turns[i].kind === "user") {
      latestUserIndex = i;
      break;
    }
  }

  const isSelected = (index: number) =>
    selectedIndex === null ? index === latestUserIndex : index === selectedIndex;

  return (
    <div
      data-testid="conversation"
      className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 lg:max-h-[calc(100vh-14rem)]"
    >
      {turns.map((turn, index) =>
        turn.kind === "user" ? (
          <div key={index} className="flex flex-col items-end gap-2">
            {turn.repeat && (
              <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Repeat attempt
              </span>
            )}
            <button
              type="button"
              data-testid="user-turn"
              aria-pressed={isSelected(index)}
              onClick={() => onSelectUser(index)}
              className={`max-w-[85%] cursor-pointer rounded-2xl rounded-br-sm bg-teal-600 px-4 py-2 text-left text-white shadow-sm transition-colors ${
                isSelected(index)
                  ? "ring-2 ring-teal-800 ring-offset-2 ring-offset-zinc-50"
                  : "hover:bg-teal-500"
              }`}
            >
              <span className="block">{turn.text}</span>
              {turn.analysis.pronunciation_warnings.length > 0 && (
                <span className="mt-1 inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                  {turn.analysis.pronunciation_warnings.length} tip
                  {turn.analysis.pronunciation_warnings.length === 1 ? "" : "s"}
                </span>
              )}
            </button>
            {turn.blob && <PlayRecording blob={turn.blob} />}
          </div>
        ) : (
          <div key={index} className="flex flex-col items-start gap-2">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-zinc-800 shadow-sm ring-1 ring-zinc-200">
              <p>{turn.text}</p>
              <div className="mt-2">
                <SpeakButton text={turn.text} />
              </div>
            </div>
          </div>
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}
