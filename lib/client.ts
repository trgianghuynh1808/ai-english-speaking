import type { AnalyzeResponse, HistoryTurn } from "./types";

export class ClientRateLimitError extends Error {
  constructor(message = "You are speaking too fast") {
    super(message);
    this.name = "ClientRateLimitError";
  }
}

export async function analyze(
  blob: Blob,
  history: HistoryTurn[],
  target?: string,
): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("audio", blob, "audio.webm");
  form.append("history", JSON.stringify(history));
  if (target) {
    form.append("target", target);
  }

  const response = await fetch("/api/analyze", {
    method: "POST",
    body: form,
  });

  if (response.status === 429) {
    throw new ClientRateLimitError();
  }

  if (!response.ok) {
    let message = `Analyze request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === "string" && body.error !== "rate_limited") {
        message = body.error;
      }
    } catch {
      // Non-JSON error body; keep the status-based message.
    }
    throw new Error(message);
  }

  return (await response.json()) as AnalyzeResponse;
}
