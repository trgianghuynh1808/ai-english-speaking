"use client";

import { Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ScaffoldingBoxProps {
  ideas: string[];
  sentence_starters: string[];
  turnKey: string | number;
  defaultRevealed?: boolean;
}

const REVEAL_SECONDS = 5;

interface ScaffoldingContentProps {
  ideas: string[];
  sentence_starters: string[];
  defaultRevealed?: boolean;
}

export function ScaffoldingBox({
  ideas,
  sentence_starters,
  turnKey,
  defaultRevealed = false,
}: ScaffoldingBoxProps) {
  return (
    <div
      data-testid="scaffolding-box"
      className="w-full rounded-xl border border-teal-200 bg-teal-50 p-4"
    >
      {/* Remounting on turnKey gives each bot turn a fresh 5s countdown. */}
      <ScaffoldingContent
        key={`${turnKey}-${defaultRevealed ? "r" : "h"}`}
        ideas={ideas}
        sentence_starters={sentence_starters}
        defaultRevealed={defaultRevealed}
      />
    </div>
  );
}

function ScaffoldingContent({
  ideas,
  sentence_starters,
  defaultRevealed = false,
}: ScaffoldingContentProps) {
  const [remaining, setRemaining] = useState(REVEAL_SECONDS);
  const [revealed, setRevealed] = useState(defaultRevealed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (defaultRevealed) {
      return;
    }
    const startedAt = Date.now();
    intervalRef.current = setInterval(() => {
      const left = Math.max(
        0,
        REVEAL_SECONDS - Math.floor((Date.now() - startedAt) / 1000),
      );
      setRemaining(left);
      if (left <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = null;
        setRevealed(true);
      }
    }, 250);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = null;
    };
  }, [defaultRevealed]);

  const revealNow = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemaining(0);
    setRevealed(true);
  };

  return (
    <>
      <div
        className="scaffolding-content space-y-3 transition-[filter] duration-300"
        style={revealed ? undefined : { filter: "blur(6px)" }}
      >
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
            Ideas
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-800">
            {ideas.map((idea, index) => (
              <li key={index}>{idea}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
            Sentence starters
          </h4>
          <ul className="space-y-1 text-sm text-zinc-800">
            {sentence_starters.map((starter, index) => (
              <li key={index}>“{starter}”</li>
            ))}
          </ul>
        </div>
      </div>

      {!revealed && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Hints mở sau {remaining}s — thử tự nói trước nhé!
          </p>
          <button
            type="button"
            data-testid="reveal-button"
            onClick={revealNow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-teal-700 shadow-sm ring-1 ring-teal-200 transition-colors hover:bg-teal-100"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Reveal now
          </button>
        </div>
      )}
    </>
  );
}
