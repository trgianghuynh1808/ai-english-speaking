"use client";

import { Volume2, VolumeX } from "lucide-react";

interface ToolbarProps {
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onNewConversation: () => void;
}

export function Toolbar({
  autoSpeak,
  onToggleAutoSpeak,
  onNewConversation,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button
        type="button"
        data-testid="auto-speak-toggle"
        aria-pressed={autoSpeak}
        onClick={onToggleAutoSpeak}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm ring-1 transition-colors ${
          autoSpeak
            ? "bg-teal-600 text-white ring-teal-600 hover:bg-teal-700"
            : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-100"
        }`}
      >
        {autoSpeak ? (
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <VolumeX className="h-4 w-4" aria-hidden="true" />
        )}
        Auto-speak {autoSpeak ? "on" : "off"}
      </button>
      <button
        type="button"
        data-testid="new-conversation"
        onClick={onNewConversation}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100"
      >
        New conversation
      </button>
    </div>
  );
}
