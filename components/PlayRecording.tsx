"use client";

import { Play } from "lucide-react";
import { useEffect, useRef } from "react";

interface PlayRecordingProps {
  blob: Blob;
}

export function PlayRecording({ blob }: PlayRecordingProps) {
  const urlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    urlRef.current = objectUrl;
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      urlRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  const play = () => {
    const url = urlRef.current;
    if (!url) {
      return;
    }
    const audio = new Audio(url);
    audioRef.current?.pause();
    audioRef.current = audio;
    void audio.play().catch(() => {
      // Playback can be blocked or fail for a malformed blob; the learner can retry.
    });
  };

  return (
    <button
      type="button"
      data-testid="play-recording"
      onClick={play}
      aria-label="Play my recording"
      title="Play my recording"
      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700/30 px-2.5 py-1.5 text-xs font-medium text-white ring-1 ring-white/40 transition-colors hover:bg-teal-700/50"
    >
      <Play className="h-4 w-4" aria-hidden="true" />
      Play my recording
    </button>
  );
}
