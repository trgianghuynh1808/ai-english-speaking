"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSpeech } from "@/lib/useSpeech";

interface SpeakButtonProps {
  text: string;
}

export function SpeakButton({ text }: SpeakButtonProps) {
  const { supported, speaking, speak, cancel } = useSpeech();

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      data-testid="speak-button"
      onClick={() => (speaking ? cancel() : speak(text))}
      aria-label={speaking ? "Stop speaking" : "Listen to this message"}
      title={speaking ? "Stop speaking" : "Listen"}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100"
    >
      {speaking ? (
        <VolumeX className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Volume2 className="h-4 w-4" aria-hidden="true" />
      )}
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}
