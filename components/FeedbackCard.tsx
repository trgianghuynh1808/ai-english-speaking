"use client";

import { RotateCcw, Volume2 } from "lucide-react";
import { useSpeech } from "@/lib/useSpeech";
import type { AnalyzeResponse } from "@/lib/types";

interface FeedbackCardProps {
  analysis: AnalyzeResponse["user_analysis"];
  onRepeat?: () => void;
}

export function FeedbackCard({ analysis, onRepeat }: FeedbackCardProps) {
  const { supported, speak } = useSpeech();
  const { raw_transcript, pronunciation_warnings, better_expression } = analysis;

  return (
    <div
      data-testid="feedback-card"
      className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm"
    >
      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          What we heard
        </h4>
        <blockquote className="rounded-r-lg border-l-2 border-zinc-300 bg-zinc-50 px-3 py-2 italic text-zinc-600">
          {raw_transcript}
        </blockquote>
      </section>

      <section className="mt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Fix these
        </h4>
        {pronunciation_warnings.length > 0 ? (
          <ul className="space-y-2">
            {pronunciation_warnings.map((warning, index) => (
              <li
                key={index}
                className="rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200"
              >
                <p>
                  <span className="font-medium text-rose-600">{warning.heard}</span>
                  <span className="mx-1 text-zinc-400">→</span>
                  <span className="font-medium text-teal-700">
                    {warning.intended}
                  </span>
                </p>
                <p className="text-zinc-600">{warning.tip}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-500">No pronunciation issues spotted</p>
        )}
      </section>

      <section className="mt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Say it naturally
        </h4>
        <div className="rounded-lg bg-teal-50 p-3 ring-1 ring-teal-200">
          <p className="text-zinc-800">{better_expression}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="speak-natural"
              onClick={() => speak(better_expression)}
              disabled={!supported}
              aria-label="Listen to the natural version"
              title="Listen to the natural version"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-teal-700 shadow-sm ring-1 ring-teal-200 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              Listen
            </button>
            {onRepeat && (
              <button
                type="button"
                data-testid="repeat-button"
                onClick={onRepeat}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-teal-700 shadow-sm ring-1 ring-teal-200 transition-colors hover:bg-teal-100"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Say it again
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
