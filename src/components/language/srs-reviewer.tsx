"use client";

import React, { useState, useEffect, useMemo } from "react";
import { type LanguageCard } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSpeech } from "@/hooks/use-speech";
import { useLanguageActions } from "@/hooks/use-language-actions";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
} from "lucide-react";
import { fsrs, Rating } from "ts-fsrs";
import { mapToFSRSCard } from "@/lib/fsrs";

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
  nextReviewDate,
  onReviewComplete,
}: {
  cards: LanguageCard[];
  nextReviewDate?: Date | null;
  onReviewComplete: () => void;
}) {
  const [queue, setQueue] = useState<LanguageCard[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  const { speak } = useSpeech();
  const { handleSrsAction } = useLanguageActions();
  const scheduler = useMemo(() => fsrs(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (cards && !sessionInitialized) {
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
    const nextDueFriendly = nextReviewDate
      ? getFriendlyInterval(nextReviewDate)
      : null;
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-500">
        <span className="text-5xl">🎉</span>
        <h3 className="mt-4 text-xl font-bold text-foreground font-vazir">
          همه کلمات هدف با موفقیت مرور شدند!
        </h3>
        <p className="text-sm text-muted-foreground mt-2 font-vazir max-w-md leading-relaxed">
          شما تمامی کلماتی که برای این بازه زمانی برنامه‌ریزی شده بودند را با
          موفقیت مرور کردید. تمرین مستمر کلید اصلی تسلط است.
        </p>
        {nextDueFriendly && (
          <div className="mt-6 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/10 text-primary text-xs font-bold font-vazir animate-pulse">
            <CalendarCheck className="size-4" />
            <span>موعد مرور بعدی شما: {nextDueFriendly}</span>
          </div>
        )}
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
    speak(currentCard.focusWord);
  };

  const handleSrsActionWrapper = async (ratingVal: Rating | "archived") => {
    const result = await handleSrsAction(currentCard, ratingVal);

    if (ratingVal === "archived") {
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

    const remaining = queue.slice(1);
    let nextQueue: LanguageCard[];

    if (ratingVal === Rating.Again && result.updatedFields) {
      const updatedCard = { ...currentCard, ...result.updatedFields };
      if (remaining.length >= 3) {
        nextQueue = [
          ...remaining.slice(0, 3),
          updatedCard,
          ...remaining.slice(3),
        ];
      } else {
        nextQueue = [...remaining, updatedCard];
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
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
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
                className="rounded-full hover:scale-105 active:scale-95 transition-transform"
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-8 pt-6 border-t border-border"
            >
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
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSrsActionWrapper(Rating.Again)}
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 text-foreground transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                      <AlertCircle className="size-4" />
                      <span className="text-sm font-bold">یادم نبود</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                      مرور بعدی: {ratingPreviews?.again}
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSrsActionWrapper(Rating.Good)}
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-foreground transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-4" />
                      <span className="text-sm font-bold">بلد بودم</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 text-center font-vazir leading-normal block">
                      مرور بعدی: {ratingPreviews?.good}
                    </span>
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSrsActionWrapper("archived")}
                  className="w-full py-3.5 px-4 rounded-xl border border-amber-500/10 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-700 dark:text-amber-400 transition-colors cursor-pointer font-vazir text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
                >
                  🏆 تسلط کامل دارم (بایگانی دائمی کلمه)
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
