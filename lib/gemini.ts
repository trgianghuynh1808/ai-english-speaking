import { GoogleGenAI, Type } from "@google/genai";
import type { AnalyzeResponse, HistoryTurn } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { parseAnalyzeResponse } from "./validate";

const DEFAULT_MODEL = "gemini-3.8-flash";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    user_analysis: {
      type: Type.OBJECT,
      properties: {
        raw_transcript: {
          type: Type.STRING,
          description:
            "Exactly what was heard in the audio, transcribed phonetically without auto-correction.",
        },
        pronunciation_warnings: {
          type: Type.ARRAY,
          description: "At most 2 of the most serious pronunciation issues.",
          items: {
            type: Type.OBJECT,
            properties: {
              heard: { type: Type.STRING },
              intended: { type: Type.STRING },
              tip: { type: Type.STRING },
            },
            required: ["heard", "intended", "tip"],
          },
        },
        better_expression: {
          type: Type.STRING,
          description:
            "Natural English recast of what the user tried to say, including any Vietnamese translation.",
        },
      },
      required: ["raw_transcript", "pronunciation_warnings", "better_expression"],
    },
    bot_reply: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "Conversational reply ending with one specific question.",
        },
        hidden_scaffolding: {
          type: Type.OBJECT,
          properties: {
            ideas: {
              type: Type.ARRAY,
              description: "2-3 short idea hints.",
              items: { type: Type.STRING },
            },
            sentence_starters: {
              type: Type.ARRAY,
              description: "Exactly 2 sentence starters.",
              items: { type: Type.STRING },
            },
          },
          required: ["ideas", "sentence_starters"],
        },
      },
      required: ["text", "hidden_scaffolding"],
    },
  },
  required: ["user_analysis", "bot_reply"],
};

const MOCK_RESPONSE: AnalyzeResponse = {
  user_analysis: {
    raw_transcript: "I think working from home help me save time.",
    pronunciation_warnings: [
      {
        heard: "workin",
        intended: "working",
        tip: 'Finish the -ing ending with a clear /ŋ/ sound, not /n/.',
      },
      {
        heard: "help",
        intended: "helps",
        tip: "Add the /s/ ending for third-person singular verbs.",
      },
    ],
    better_expression: "I think working from home helps me save time.",
  },
  bot_reply: {
    text: "That makes sense. What is the biggest time saver for you when you work from home?",
    hidden_scaffolding: {
      ideas: ["No commute", "Flexible breaks", "Fewer interruptions"],
      sentence_starters: [
        "The biggest time saver for me is...",
        "I save time because I...",
      ],
    },
  },
};

export async function analyzeAudio({
  audio,
  mimeType,
  history,
}: {
  audio: Buffer;
  mimeType: string;
  history: HistoryTurn[];
}): Promise<AnalyzeResponse> {
  if (process.env.MOCK_GEMINI === "1") {
    return parseAnalyzeResponse(MOCK_RESPONSE);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
    contents: [
      { text: buildUserPrompt(history) },
      { inlineData: { mimeType, data: audio.toString("base64") } },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned a response that is not valid JSON");
  }

  return parseAnalyzeResponse(parsed);
}
