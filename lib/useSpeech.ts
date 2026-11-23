"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export interface UseSpeechResult {
  supported: boolean;
  speaking: boolean;
  speak: (text: string) => void;
  cancel: () => void;
}

const noopSubscribe = () => () => {};

function getSupportedSnapshot(): boolean {
  return typeof window !== "undefined" && Boolean(window.speechSynthesis);
}

function getSupportedServerSnapshot(): boolean {
  return false;
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find((voice) => voice.lang === "en-US") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    null
  );
}

export function useSpeech(): UseSpeechResult {
  const supported = useSyncExternalStore(
    noopSubscribe,
    getSupportedSnapshot,
    getSupportedServerSnapshot,
  );
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const synthesis =
      typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synthesis) {
      return;
    }
    mountedRef.current = true;

    const refreshVoice = () => {
      voiceRef.current = pickVoice(synthesis.getVoices());
    };
    refreshVoice();
    synthesis.addEventListener("voiceschanged", refreshVoice);

    return () => {
      mountedRef.current = false;
      synthesis.removeEventListener("voiceschanged", refreshVoice);
      synthesis.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    const synthesis = window.speechSynthesis;
    if (!synthesis) {
      return;
    }
    synthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    const synthesis = window.speechSynthesis;
    if (!synthesis) {
      return;
    }
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }
    utterance.onstart = () => {
      if (mountedRef.current) {
        setSpeaking(true);
      }
    };
    utterance.onend = () => {
      if (mountedRef.current) {
        setSpeaking(false);
      }
    };
    utterance.onerror = () => {
      if (mountedRef.current) {
        setSpeaking(false);
      }
    };

    synthesis.speak(utterance);
  }, []);

  return { supported, speaking, speak, cancel };
}
