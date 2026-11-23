"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef } from "react";
import { useRecorder } from "@/lib/useRecorder";

interface RecorderProps {
  onComplete: (blob: Blob) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const BAR_COUNT = 24;

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function Recorder({
  onComplete,
  disabled = false,
  disabledReason,
}: RecorderProps) {
  const { state, seconds, level, error, start, stop } = useRecorder({
    maxSeconds: 60,
  });

  const wasRecordingRef = useRef(false);
  const deliveredRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (state === "recording") {
      wasRecordingRef.current = true;
      deliveredRef.current = false;
      return;
    }
    if (!wasRecordingRef.current || deliveredRef.current) {
      return;
    }
    deliveredRef.current = true;
    wasRecordingRef.current = false;
    stop()
      .then((blob) => onCompleteRef.current(blob))
      .catch(() => {
        // Stopping failed without a blob; the user can simply record again.
      });
  }, [state, stop]);

  const recording = state === "recording";
  const buttonDisabled = disabled && !recording;
  const notice = disabledReason ?? error;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex h-16 items-end gap-1" aria-hidden="true">
        {recording &&
          Array.from({ length: BAR_COUNT }, (_, index) => {
            const variance = 0.35 + 0.65 * Math.abs(Math.sin(index * 0.9));
            const barHeight = 6 + level * 56 * variance;
            return (
              <span
                key={index}
                className="w-1.5 rounded-full bg-teal-500/80"
                style={{ height: `${Math.max(6, barHeight)}px` }}
              />
            );
          })}
      </div>

      <button
        type="button"
        data-testid="record-button"
        onClick={() => {
          if (recording) {
            void stop();
          } else {
            void start();
          }
        }}
        disabled={buttonDisabled}
        title={disabled ? (disabledReason ?? "Recording is unavailable") : undefined}
        aria-label={recording ? "Stop recording" : "Start recording"}
        className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-colors ${
          recording
            ? "bg-rose-500 hover:bg-rose-600"
            : buttonDisabled
              ? "cursor-not-allowed bg-zinc-400"
              : "bg-teal-600 hover:bg-teal-700"
        }`}
      >
        {recording ? (
          <Square className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Mic className="h-7 w-7" aria-hidden="true" />
        )}
      </button>

      {recording && (
        <p
          data-testid="record-timer"
          className="font-mono text-lg tabular-nums text-zinc-700"
        >
          {formatTimer(seconds)}
        </p>
      )}

      {recording && (
        <p className="text-sm text-zinc-500">Tap the button to send your turn.</p>
      )}

      {!recording && notice && (
        <p
          data-testid="recorder-notice"
          className="max-w-xs text-center text-sm text-zinc-600"
        >
          {notice}
        </p>
      )}
    </div>
  );
}
