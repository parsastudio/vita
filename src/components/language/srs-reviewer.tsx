"use client";

import React, { useState, useEffect, useMemo } from "react";
import { localDb, type LanguageCard } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, CheckCircle2, AlertCircle } from "lucide-react";
import { fsrs, Rating, type Grade } from "ts-fsrs";
import { mapToFSRSCard, mapFromFSRSCard } from "@/lib/fsrs";

function getFriendlyInterval(dueDate: Date, now: Date = new Date()): string {
  const diffMs = dueDate.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin <= 0) return "اکنون";
  if (diffMin < 60) return `${diffMin} دقیقه دیگر`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ساعت دیگر`;
  const diffDays = Math.round(diffHr / 24);
  return `${diffDays} روز دیگر`;
}

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

  const scheduler = useMemo(() => fsrs(), []);

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

  const ratingPreviews = useMemo(() => {
    if (!currentCard) return null;
    const now = new Date();
    const cardRepresentation = mapToFSRSCard(currentCard);
    const outcomes = scheduler.repeat(cardRepresentation, now);
    return {
      again: getFriendlyInterval(outcomes[Rating.Again].card.due, now),
      good: getFriendlyInterval(outcomes[Rating.Good].card.due, now),
    };
  }, [currentCard, scheduler]);

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

  const handleSrsAction = async (ratingVal: Rating | "archived") => {
    if (ratingVal === "archived") {
      await localDb.languageCards.update(currentCard.id, {
        srsStatus: "archived",
        difficulty: 1.0,
        updatedAt: new Date(),
        synced: false,
      });

      toast(
        "کارت با موفقیت به بایگانی دائمی منتقل شد و دیگر در چرخه مرور ظاهر نخواهد شد",
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

    const now = new Date();
    const cardRepresentation = mapToFSRSCard(currentCard);
    const result = scheduler.next(cardRepresentation, now, ratingVal as Grade);
    const updatedFields = mapFromFSRSCard(result.card);

    await localDb.languageCards.update(currentCard.id, {
      ...updatedFields,
      updatedAt: new Date(),
      synced: false,
    });

    const remaining = queue.slice(1);
    let nextQueue: LanguageCard[];

    if (ratingVal === Rating.Again) {
      if (remaining.length >= 3) {
        nextQueue = [
          ...remaining.slice(0, 3),
          { ...currentCard, ...updatedFields },
          ...remaining.slice(3),
        ];
      } else {
        nextQueue = [...remaining, { ...currentCard, ...updatedFields }];
      }
    } else {
      nextQueue = remaining;
    }

    setQueue(nextQueue);
    setShowAnswer(false);
    if (nextQueue.length === 0) {
      onReviewComplete();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
          جلسه مرور تطبیقی کلمات
        </span>
        <span className="text-xs font-medium text-muted-foreground font-vazir">
          در انتظار مرور: {queue.length} کلمه
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
              className="w-full mt-8 font-vazir text-sm py-5 shadow-md bg-primary text-primary-foreground hover:bg-primary/95 transition-all"
              onClick={() => setShowAnswer(true)}
            >
              نمایش ترجمه فارسی
            </Button>
          ) : (
            <div className="space-y-8 pt-6 border-t border-border animate-in fade-in duration-300">
              <div className="space-y-3">
                <p className="text-xl font-bold text-primary font-vazir">
                  {currentCard.translation}
                </p>
                <p className="text-xs text-muted-foreground font-vazir">
                  کلمه کلیدی هدف:{" "}
                  <span className="text-destructive font-semibold">
                    {currentCard.focusWord}
                  </span>
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSrsAction(Rating.Again)}
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 text-foreground transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                      <AlertCircle className="size-4" />
                      <span className="text-sm font-bold">یادم نبود</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                      مرور بعدی: {ratingPreviews?.again}
                    </span>
                  </button>

                  <button
                    onClick={() => handleSrsAction(Rating.Good)}
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-foreground transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-4" />
                      <span className="text-sm font-bold">بلد بودم</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                      مرور بعدی: {ratingPreviews?.good}
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => handleSrsAction("archived")}
                  className="w-full py-3.5 px-4 rounded-xl border border-amber-500/10 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-700 dark:text-amber-400 transition-all cursor-pointer font-vazir text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
                >
                  🏆 تسلط کامل دارم (بایگانی دائمی کلمه)
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
