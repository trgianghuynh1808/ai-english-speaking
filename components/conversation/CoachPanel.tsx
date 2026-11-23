"use client";

import { FeedbackCard } from "../FeedbackCard";
import { ScaffoldingBox } from "../ScaffoldingBox";
import type { AnalyzeResponse } from "@/lib/types";

interface CoachPanelProps {
  scaffolding: { ideas: string[]; sentence_starters: string[] };
  scaffoldingKey: string | number;
  defaultRevealed?: boolean;
  analysis: AnalyzeResponse["user_analysis"] | null;
  onRepeat?: () => void;
}

export function CoachPanel({
  scaffolding,
  scaffoldingKey,
  defaultRevealed = false,
  analysis,
  onRepeat,
}: CoachPanelProps) {
  return (
    <aside
      data-testid="coach-panel"
      className="rounded-xl border border-zinc-200 bg-white p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] overflow-y-auto"
    >
      <section data-testid="hints-section">
        <h3 className="mb-2 text-sm font-semibold text-zinc-800">Hints</h3>
        <ScaffoldingBox
          ideas={scaffolding.ideas}
          sentence_starters={scaffolding.sentence_starters}
          turnKey={scaffoldingKey}
          defaultRevealed={defaultRevealed}
        />
      </section>

      <section
        data-testid="feedback-section"
        className="mt-4 border-t border-zinc-200 pt-4"
      >
        <h3 className="mb-2 text-sm font-semibold text-zinc-800">Feedback</h3>
        {analysis ? (
          <FeedbackCard analysis={analysis} onRepeat={onRepeat} />
        ) : (
          <p className="text-sm text-zinc-500">
            Your feedback will appear here after you speak.
          </p>
        )}
      </section>
    </aside>
  );
}
