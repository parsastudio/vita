"use client";

import React, { useState, useEffect } from "react";
import { localDb, type LanguageCard } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPersianNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2 } from "lucide-react";

export function SrsReviewer({
  cards,
  onReviewComplete,
}: {
  cards: LanguageCard[];
  onReviewComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentCard = cards[index];

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
        <span className="text-4xl">🎉</span>
        <h3 className="mt-4 text-lg font-bold text-foreground font-vazir">
          تمامی کارت‌ها مرور شدند!
        </h3>
        <p className="text-sm text-muted-foreground mt-1 font-vazir">
          در حال حاضر هیچ کارتی در جعبه لایتنر شما نیاز به مرور ندارد.
        </p>
      </div>
    );
  }

  const handleSpeak = () => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentCard.focusWord);
        utterance.lang = "en-US";
        let voices = window.speechSynthesis.getVoices();

        const triggerSpeech = () => {
          const enVoice = voices.find((v) => v.lang.startsWith("en"));
          if (enVoice) {
            utterance.voice = enVoice;
          }
          window.speechSynthesis.speak(utterance);
        };

        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            triggerSpeech();
          };
        } else {
          triggerSpeech();
        }
      } else {
        toast("مرورگر شما از قابلیت تلفظ صوتی پشتیبانی نمی‌کند", "error");
      }
    } catch {
      toast("خطایی در اجرای قابلیت تلفظ صوتی رخ داد", "error");
    }
  };

  const handleSrsAction = async (
    rating: "hard" | "medium" | "easy" | "archived",
  ) => {
    let intervalDays = currentCard.intervalDays;
    let easeFactor = currentCard.easeFactor;
    let nextReviewAt = new Date();

    if (rating === "hard") {
      intervalDays = 0;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      nextReviewAt.setHours(nextReviewAt.getHours() + 1);
      toast("کارت مجدداً به چرخه مرور سریع بازگشت", "info");
    } else if (rating === "medium") {
      intervalDays = intervalDays === 0 ? 2 : intervalDays * 2;
      nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);
      toast(
        `کارت برای ${formatPersianNumber(intervalDays)} روز بعد برنامه‌ریزی شد`,
        "success",
      );
    } else if (rating === "easy") {
      intervalDays =
        intervalDays === 0 ? 6 : Math.round(intervalDays * easeFactor);
      easeFactor = easeFactor + 0.15;
      nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);
      toast(
        `کارت با موفقیت برای ${formatPersianNumber(intervalDays)} روز بعد برنامه‌ریزی شد`,
        "success",
      );
    } else if (rating === "archived") {
      toast("کارت با موفقیت بایگانی (فراگرفته‌شده) شد", "success");
    }

    await localDb.languageCards.update(currentCard.id, {
      srsStatus: rating,
      intervalDays,
      easeFactor,
      nextReviewAt,
      updatedAt: new Date(),
      synced: false,
    });

    setShowAnswer(false);
    if (index + 1 >= cards.length) {
      onReviewComplete();
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
          جلسه مرور لایتنر
        </span>
        <span className="text-xs font-medium text-muted-foreground font-vazir">
          کارت {mounted ? formatPersianNumber(index + 1) : index + 1} از{" "}
          {mounted ? formatPersianNumber(cards.length) : cards.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index + (showAnswer ? "-ans" : "-ques")}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="space-y-6 text-center"
        >
          <div className="space-y-4">
            <p className="text-3xl font-bold tracking-tight text-foreground select-none ltr">
              {currentCard.originalText}
            </p>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleSpeak}
                aria-label="تلفظ صوتی کلمه"
                className="rounded-full hover:scale-105 transition-transform"
              >
                <Volume2 className="size-4" />
              </Button>
            </div>
          </div>

          {!showAnswer ? (
            <Button
              size="lg"
              className="w-full mt-8 font-vazir"
              onClick={() => setShowAnswer(true)}
            >
              نمایش ترجمه فارسی
            </Button>
          ) : (
            <div className="space-y-8 pt-4 border-t border-border animate-in fade-in duration-300">
              <div className="space-y-2">
                <p className="text-xl font-bold text-primary font-vazir">
                  {currentCard.translation}
                </p>
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-xs text-muted-foreground font-medium font-vazir">
                    کلمه تمرکزی اصلی:{" "}
                    <span className="text-destructive font-semibold">
                      {currentCard.focusWord}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 font-vazir text-xs transition-colors"
                  onClick={() => handleSrsAction("hard")}
                >
                  سخت (مرور سریع)
                </Button>
                <Button
                  variant="outline"
                  className="hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30 font-vazir text-xs transition-colors"
                  onClick={() => handleSrsAction("medium")}
                >
                  متوسط
                </Button>
                <Button
                  variant="outline"
                  className="hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30 font-vazir text-xs transition-colors"
                  onClick={() => handleSrsAction("easy")}
                >
                  آسان
                </Button>
                <Button
                  variant="outline"
                  className="hover:bg-muted/50 font-vazir text-xs transition-colors"
                  onClick={() => handleSrsAction("archived")}
                >
                  یاد گرفتم (آرشیو)
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
