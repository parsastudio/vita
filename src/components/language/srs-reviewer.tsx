"use client";

import React, { useState, useEffect } from "react";
import { localDb, type LanguageCard } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2 } from "lucide-react";

export function SrsReviewer({
  cards,
  onReviewComplete,
}: {
  cards: LanguageCard[];
  onReviewComplete: () => void;
}) {
  const [queue, setQueue] = useState<LanguageCard[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (cards && cards.length > 0 && !sessionInitialized) {
      setQueue([...cards]);
      setSessionInitialized(true);
    }
  }, [cards, sessionInitialized]);

  const currentCard = queue[0];

  if (mounted && sessionInitialized && queue.length === 0) {
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

  if (queue.length === 0) {
    return (
      <div className="h-48 bg-muted/20 rounded-2xl animate-pulse flex items-center justify-center text-xs text-muted-foreground font-vazir">
        در حال بارگذاری جلسه مرور...
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

  const handleSrsAction = async (rating: "learned" | "forgot" | "archived") => {
    if (rating === "archived") {
      await localDb.languageCards.update(currentCard.id, {
        srsStatus: "archived",
        difficulty: 0.05,
        updatedAt: new Date(),
        synced: false,
      });

      toast(
        "کارت با موفقیت آرشیو شد و سطح سختی آن به حداقل نزول یافت",
        "success",
      );
      const nextQueue = queue.slice(1);
      setQueue(nextQueue);
      setShowAnswer(false);
      if (nextQueue.length === 0) {
        onReviewComplete();
      }
      return;
    }

    if (rating === "learned") {
      const nextStreak = (currentCard.streak ?? 0) + 1;
      const nextDifficulty = Math.max(
        0.05,
        (currentCard.difficulty ?? 0.5) - 0.1,
      );
      let nextStability = currentCard.stability ?? 1;

      if (nextStreak === 1) {
        nextStability = 1;
      } else if (nextStreak === 2) {
        nextStability = 3;
      } else if (nextStreak >= 3) {
        nextStability = nextStability * ((3.5 - nextDifficulty) * 1.2);
      }

      const nextReviewDate = new Date();
      nextReviewDate.setDate(
        nextReviewDate.getDate() + Math.round(nextStability),
      );

      await localDb.languageCards.update(currentCard.id, {
        streak: nextStreak,
        difficulty: Number(nextDifficulty.toFixed(4)),
        stability: Number(nextStability.toFixed(4)),
        nextReviewDate,
        updatedAt: new Date(),
        synced: false,
      });

      const nextQueue = queue.slice(1);
      setQueue(nextQueue);
      setShowAnswer(false);
      if (nextQueue.length === 0) {
        onReviewComplete();
      }
    } else if (rating === "forgot") {
      const nextStreak = 0;
      const nextDifficulty = Math.min(
        1.0,
        (currentCard.difficulty ?? 0.5) + 0.2,
      );
      const nextStability = 1;

      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + 1);

      await localDb.languageCards.update(currentCard.id, {
        streak: nextStreak,
        difficulty: Number(nextDifficulty.toFixed(4)),
        stability: nextStability,
        nextReviewDate,
        updatedAt: new Date(),
        synced: false,
      });

      const remaining = queue.slice(1);
      let nextQueue: LanguageCard[];
      if (remaining.length >= 4) {
        nextQueue = [
          ...remaining.slice(0, 4),
          currentCard,
          ...remaining.slice(4),
        ];
      } else {
        nextQueue = [...remaining, currentCard];
      }

      setQueue(nextQueue);
      setShowAnswer(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
          جلسه مرور لایتنر تطبیقی
        </span>
        <span className="text-xs font-medium text-muted-foreground font-vazir">
          کارت فعال نوبت فعلی
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentCard.id + (showAnswer ? "-ans" : "-ques")}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => handleSrsAction("forgot")}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card hover:bg-red-500/5 hover:border-red-500/20 text-foreground transition-all cursor-pointer group"
                >
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    فراموش کردم
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    تنظیم مجدد توالی و تکرار کلمه در همین جلسه
                  </span>
                </button>

                <button
                  onClick={() => handleSrsAction("learned")}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card hover:bg-green-500/5 hover:border-green-500/20 text-foreground transition-all cursor-pointer group"
                >
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    بلد بودم
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    افزایش توالی پاسخ‌های صحیح و فاصله مرور بعدی
                  </span>
                </button>

                <button
                  onClick={() => handleSrsAction("archived")}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/20 text-foreground transition-all cursor-pointer group"
                >
                  <span className="text-sm font-bold text-primary">
                    آرشیو کلمه
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    بایگانی و خروج دائمی کلمه از چرخه فعال لایتنر
                  </span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
