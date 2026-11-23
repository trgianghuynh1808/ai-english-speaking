import { analyzeAudio, RateLimitError } from "@/lib/gemini";
import type { HistoryTurn } from "@/lib/types";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

function isHistoryTurn(value: unknown): value is HistoryTurn {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const turn = value as Record<string, unknown>;
  return (
    (turn.role === "user" || turn.role === "bot") && typeof turn.text === "string"
  );
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || !audio.type.startsWith("audio/")) {
    return Response.json(
      { error: "Expected an audio file in the 'audio' field" },
      { status: 400 },
    );
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "Audio file exceeds the 10 MB limit" }, { status: 413 });
  }

  const historyRaw = form.get("history");
  let history: HistoryTurn[] = [];
  if (historyRaw !== null) {
    if (typeof historyRaw !== "string") {
      return Response.json({ error: "'history' must be a JSON string" }, { status: 400 });
    }
    if (historyRaw !== "") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(historyRaw);
      } catch {
        return Response.json({ error: "'history' must be valid JSON" }, { status: 400 });
      }
      if (!Array.isArray(parsed) || !parsed.every(isHistoryTurn)) {
        return Response.json(
          {
            error:
              "'history' must be a JSON array of { role: 'user' | 'bot', text: string }",
          },
          { status: 400 },
        );
      }
      history = parsed;
    }
  }

  try {
    const result = await analyzeAudio({
      audio: Buffer.from(await audio.arrayBuffer()),
      mimeType: audio.type,
      history,
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json({ error: "rate_limited" }, { status: 429 });
    }
    console.error(
      "analyze failed:",
      error instanceof Error ? error.message : String(error),
    );
    return Response.json({ error: "Failed to analyze audio" }, { status: 502 });
  }
}
