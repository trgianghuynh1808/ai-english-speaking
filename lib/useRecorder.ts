"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording";

export interface UseRecorderResult {
  state: RecorderState;
  seconds: number;
  level: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
}

interface UseRecorderOptions {
  maxSeconds?: number;
}

const DEFAULT_MAX_SECONDS = 60;

function friendlyMicError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Không truy cập được mic. Hãy cho phép dùng micro trong trình duyệt rồi thử lại nhé.";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "Không tìm thấy micro. Hãy kiểm tra thiết bị rồi thử lại nhé.";
    }
  }
  return "Không bắt đầu được bản ghi. Bạn thử lại nhé.";
}

export function useRecorder({
  maxSeconds = DEFAULT_MAX_SECONDS,
}: UseRecorderOptions = {}): UseRecorderResult {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const resolveStopRef = useRef<((blob: Blob) => void) | null>(null);
  const lastBlobRef = useRef<Blob | null>(null);

  const cleanup = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const context = audioContextRef.current;
    if (context) {
      void context.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    recorderRef.current = null;
    startedAtRef.current = null;
    setLevel(0);
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      const blob = lastBlobRef.current;
      if (blob) {
        return Promise.resolve(blob);
      }
      return Promise.reject(new Error("Recorder is not active"));
    }
    return new Promise<Blob>((resolve) => {
      resolveStopRef.current = resolve;
      recorder.stop();
    });
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) {
      return;
    }
    setError(null);
    lastBlobRef.current = null;
    chunksRef.current = [];
    setSeconds(0);
    setLevel(0);

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("MediaRecorder API is not available in this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : undefined;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        lastBlobRef.current = blob;
        const resolveStop = resolveStopRef.current;
        resolveStopRef.current = null;
        cleanup();
        setState("idle");
        resolveStop?.(blob);
      };

      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const tickLevel = () => {
        const currentAnalyser = analyserRef.current;
        if (!currentAnalyser) {
          return;
        }
        const data = new Uint8Array(currentAnalyser.fftSize);
        currentAnalyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const value = (data[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(1, rms * 2.5));
        animationRef.current = requestAnimationFrame(tickLevel);
      };

      recorder.start();
      setState("recording");
      startedAtRef.current = Date.now();

      intervalRef.current = setInterval(() => {
        const startedAt = startedAtRef.current;
        if (startedAt === null) {
          return;
        }
        const elapsed = (Date.now() - startedAt) / 1000;
        setSeconds(Math.floor(elapsed));
        if (elapsed >= maxSeconds) {
          void stopRecording();
        }
      }, 250);

      animationRef.current = requestAnimationFrame(tickLevel);
    } catch (caught) {
      cleanup();
      setState("idle");
      setError(friendlyMicError(caught));
    }
  }, [cleanup, maxSeconds, stopRecording]);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      cleanup();
    };
  }, [cleanup]);

  return { state, seconds, level, error, start, stop: stopRecording };
}
