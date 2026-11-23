import type { AnalyzeResponse } from "@/lib/types";

interface FeedbackCardProps {
  analysis: AnalyzeResponse["user_analysis"];
}

export function FeedbackCard({ analysis }: FeedbackCardProps) {
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
        <p className="italic text-zinc-700">{raw_transcript}</p>
      </section>

      {pronunciation_warnings.length > 0 && (
        <section className="mt-3">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Pronunciation
          </h4>
          <ul className="space-y-2">
            {pronunciation_warnings.map((warning, index) => (
              <li key={index}>
                <p>
                  <span className="font-medium text-rose-600">{warning.heard}</span>
                  <span className="mx-1 text-zinc-400">→</span>
                  <span className="font-medium text-teal-700">{warning.intended}</span>
                </p>
                <p className="text-zinc-600">{warning.tip}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-3">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Natural version
        </h4>
        <p className="text-zinc-800">{better_expression}</p>
      </section>
    </div>
  );
}
