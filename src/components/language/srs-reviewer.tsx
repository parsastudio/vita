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
    rating: "forgot" | "hard" | "medium" | "easy" | "archived",
  ) => {
    let nextDifficulty = currentCard.difficulty;
    let nextStatus = currentCard.srsStatus;

    if (rating === "archived") {
      nextStatus = "archived";
      nextDifficulty = 0.05;
      toast(
        "کارت با موفقیت آرشیو شد و سطح سختی آن به حداقل نزول یافت",
        "success",
      );
    } else {
      if (rating === "forgot") {
        nextDifficulty = Math.min(1.0, nextDifficulty + 0.4);
        toast(
          "کارت به عنوان فراموش‌شده علامت خورد؛ تکرار شدید اعمال خواهد شد",
          "error",
        );
      } else if (rating === "hard") {
        nextDifficulty = Math.min(1.0, nextDifficulty + 0.1);
        toast("کارت با موفقیت ثبت شد", "info");
      } else if (rating === "medium") {
        nextDifficulty = Math.max(0.05, nextDifficulty - 0.15);
        toast("کارت با موفقیت ثبت شد", "success");
      } else if (rating === "easy") {
        nextDifficulty = Math.max(0.05, nextDifficulty - 0.4);
        toast("کارت با موفقیت ثبت شد و اولویت نمایش کاهش یافت", "success");
      }
    }

    await localDb.languageCards.update(currentCard.id, {
      srsStatus: nextStatus,
      difficulty: Number(nextDifficulty.toFixed(4)),
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
          جلسه مرور لایتنر تطبیقی
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <button
                  onClick={() => handleSrsAction("forgot")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-red-500/5 hover:border-red-500/20 text-foreground transition-all cursor-pointer group"
                >
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">
                    بلد نبودم
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    فراموشی / پاسخ اشتباه
                  </span>
                </button>

                <button
                  onClick={() => handleSrsAction("hard")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-amber-500/5 hover:border-amber-500/20 text-foreground transition-all cursor-pointer group"
                >
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    سخت
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    پاسخ طولانی (تا ۲۰ ثانیه)
                  </span>
                </button>

                <button
                  onClick={() => handleSrsAction("medium")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-blue-500/5 hover:border-blue-500/20 text-foreground transition-all cursor-pointer group"
                >
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    متوسط
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    پاسخ متوسط (بین ۵ تا ۱۰ ثانیه)
                  </span>
                </button>

                <button
                  onClick={() => handleSrsAction("easy")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-green-500/5 hover:border-green-500/20 text-foreground transition-all cursor-pointer group"
                >
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">
                    آسان
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    پاسخ فوری (کمتر از ۵ ثانیه)
                  </span>
                </button>

                <button
                  onClick={() => handleSrsAction("archived")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/20 text-foreground transition-all cursor-pointer group col-span-1 sm:col-span-2 md:col-span-1"
                >
                  <span className="text-xs font-bold text-primary">
                    آرشیو کلمه
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    بایگانی و خروج از چرخه مرور
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
