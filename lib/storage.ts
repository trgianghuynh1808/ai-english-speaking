import type { AnalyzeResponse } from "./types";

export type StoredTurn =
  | { kind: "user"; text: string; analysis: AnalyzeResponse["user_analysis"] }
  | {
      kind: "bot";
      text: string;
      scaffolding: { ideas: string[]; sentence_starters: string[] };
    };

const CONVERSATION_KEY = "aesc.conversation.v1";
const AUTO_SPEAK_KEY = "aesc.autoSpeak";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPronunciationWarning(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const warning = value as Record<string, unknown>;
  return (
    typeof warning.heard === "string" &&
    typeof warning.intended === "string" &&
    typeof warning.tip === "string"
  );
}

function isUserTurn(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const turn = value as Record<string, unknown>;
  if (turn.kind !== "user" || typeof turn.text !== "string") {
    return false;
  }
  const analysis = turn.analysis as Record<string, unknown> | null | undefined;
  if (typeof analysis !== "object" || analysis === null) {
    return false;
  }
  return (
    typeof analysis.raw_transcript === "string" &&
    typeof analysis.better_expression === "string" &&
    Array.isArray(analysis.pronunciation_warnings) &&
    analysis.pronunciation_warnings.every(isPronunciationWarning)
  );
}

function isBotTurn(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const turn = value as Record<string, unknown>;
  if (turn.kind !== "bot" || typeof turn.text !== "string") {
    return false;
  }
  const scaffolding = turn.scaffolding as Record<string, unknown> | null | undefined;
  if (typeof scaffolding !== "object" || scaffolding === null) {
    return false;
  }
  return (
    isStringArray(scaffolding.ideas) && isStringArray(scaffolding.sentence_starters)
  );
}

function isStoredTurn(value: unknown): value is StoredTurn {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const kind = (value as Record<string, unknown>).kind;
  if (kind === "user") {
    return isUserTurn(value);
  }
  if (kind === "bot") {
    return isBotTurn(value);
  }
  return false;
}

export function loadConversation(): StoredTurn[] | null {
  try {
    const raw = window.localStorage.getItem(CONVERSATION_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }
    if (!parsed.every(isStoredTurn)) {
      return null;
    }
    return parsed as StoredTurn[];
  } catch {
    return null;
  }
}

export function saveConversation(turns: StoredTurn[]): void {
  try {
    window.localStorage.setItem(CONVERSATION_KEY, JSON.stringify(turns));
  } catch {
    // Storage can be full or unavailable (private mode); the app keeps working in memory.
  }
}

export function clearConversation(): void {
  try {
    window.localStorage.removeItem(CONVERSATION_KEY);
  } catch {
    // Ignore: nothing to clear if storage is unavailable.
  }
}

export function loadAutoSpeak(): boolean {
  try {
    const raw = window.localStorage.getItem(AUTO_SPEAK_KEY);
    if (raw === "false") {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export function saveAutoSpeak(value: boolean): void {
  try {
    window.localStorage.setItem(AUTO_SPEAK_KEY, value ? "true" : "false");
  } catch {
    // Ignore: the toggle still works for the current session.
  }
}
