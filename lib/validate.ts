import type { AnalyzeResponse, PronunciationWarning } from "./types";

const MAX_PRONUNCIATION_WARNINGS = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid analyze response: "${field}" must be a string`);
  }
  return value.trim();
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Invalid analyze response: "${field}" must be an array of strings`);
  }
  return value.map((item) => item.trim());
}

function parsePronunciationWarning(value: unknown, index: number): PronunciationWarning {
  const field = `user_analysis.pronunciation_warnings[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Invalid analyze response: "${field}" must be an object`);
  }
  return {
    heard: requireString(value.heard, `${field}.heard`),
    intended: requireString(value.intended, `${field}.intended`),
    tip: requireString(value.tip, `${field}.tip`),
  };
}

export function parseAnalyzeResponse(raw: unknown): AnalyzeResponse {
  if (!isRecord(raw)) {
    throw new Error('Invalid analyze response: expected an object');
  }

  const userAnalysis = raw.user_analysis;
  if (!isRecord(userAnalysis)) {
    throw new Error('Invalid analyze response: "user_analysis" must be an object');
  }

  const warnings = userAnalysis.pronunciation_warnings;
  if (!Array.isArray(warnings)) {
    throw new Error(
      'Invalid analyze response: "user_analysis.pronunciation_warnings" must be an array',
    );
  }

  const botReply = raw.bot_reply;
  if (!isRecord(botReply)) {
    throw new Error('Invalid analyze response: "bot_reply" must be an object');
  }

  const scaffolding = botReply.hidden_scaffolding;
  if (!isRecord(scaffolding)) {
    throw new Error(
      'Invalid analyze response: "bot_reply.hidden_scaffolding" must be an object',
    );
  }

  return {
    user_analysis: {
      raw_transcript: requireString(
        userAnalysis.raw_transcript,
        "user_analysis.raw_transcript",
      ),
      pronunciation_warnings: warnings
        .slice(0, MAX_PRONUNCIATION_WARNINGS)
        .map(parsePronunciationWarning),
      better_expression: requireString(
        userAnalysis.better_expression,
        "user_analysis.better_expression",
      ),
    },
    bot_reply: {
      text: requireString(botReply.text, "bot_reply.text"),
      hidden_scaffolding: {
        ideas: requireStringArray(
          scaffolding.ideas,
          "bot_reply.hidden_scaffolding.ideas",
        ),
        sentence_starters: requireStringArray(
          scaffolding.sentence_starters,
          "bot_reply.hidden_scaffolding.sentence_starters",
        ),
      },
    },
  };
}
