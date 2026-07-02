"use client";

import React, { useState, useEffect, useMemo } from "react";
import { localDb, type LanguageCard } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2 } from "lucide-react";
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
      hard: getFriendlyInterval(outcomes[Rating.Hard].card.due, now),
      good: getFriendlyInterval(outcomes[Rating.Good].card.due, now),
      easy: getFriendlyInterval(outcomes[Rating.Easy].card.due, now),
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

      toast("کارت با موفقیت به بخش آرشیو منتقل شد", "success");
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
          جلسه مرور تطبیقی FSRS
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
                <button
                  onClick={() => handleSrsAction(Rating.Again)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-red-500/5 hover:border-red-500/20 text-foreground transition-all cursor-pointer group"
                >
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    یادم نبود
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    {ratingPreviews?.again}
                  </span>
                </button>

                <button
                  onClick={() => handleSrsAction(Rating.Hard)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-amber-500/5 hover:border-amber-500/20 text-foreground transition-all cursor-pointer group"
                >
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    سخت بود
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    {ratingPreviews?.hard}
                  </span>
                </button>

                <button
                  onClick={() => handleSrsAction(Rating.Good)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-green-500/5 hover:border-green-500/20 text-foreground transition-all cursor-pointer group"
                >
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    بلد بودم
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    {ratingPreviews?.good}
                  </span>
                </button>

                <button
                  onClick={() => handleSrsAction(Rating.Easy)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-blue-500/5 hover:border-blue-500/20 text-foreground transition-all cursor-pointer group"
                >
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    خیلی آسان
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                    {ratingPreviews?.easy}
                  </span>
                </button>
              </div>

              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSrsAction("archived")}
                  className="font-vazir text-xs"
                >
                  انتقال کارت به بایگانی فعال (آرشیو کلمه)
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
