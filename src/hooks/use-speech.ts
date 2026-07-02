"use client";

import { useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export function useSpeech() {
  const { toast } = useToast();
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        toast("مرورگر شما از قابلیت تلفظ صوتی پشتیبانی نمی‌کند", "error");
        return;
      }

      try {
        window.speechSynthesis.cancel();
        activeUtteranceRef.current = null;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        activeUtteranceRef.current = utterance;

        const performSpeak = () => {
          const voices = window.speechSynthesis.getVoices();
          const enVoice = voices.find((v) => v.lang.startsWith("en"));
          if (enVoice) {
            utterance.voice = enVoice;
          }
          window.speechSynthesis.speak(utterance);
        };

        const voicesList = window.speechSynthesis.getVoices();
        if (voicesList.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            performSpeak();
            window.speechSynthesis.onvoiceschanged = null;
          };
        } else {
          performSpeak();
        }
      } catch {
        toast("خطایی در اجرای قابلیت تلفظ صوتی رخ داد", "error");
      }
    },
    [toast],
  );

  return { speak };
}
