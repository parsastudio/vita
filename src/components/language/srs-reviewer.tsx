"use client";

import React, { useState } from "react";
import { localDb, type LanguageCard } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  const currentCard = cards[index];

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl">🎉</span>
        <h3 className="mt-4 text-lg font-bold text-foreground">
          All caught up!
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          No language cards are scheduled for review right now.
        </p>
      </div>
    );
  }

  const handleSpeak = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentCard.originalText);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
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
      toast("Scheduled card for immediate review", "info");
    } else if (rating === "medium") {
      intervalDays = intervalDays === 0 ? 2 : intervalDays * 2;
      nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);
      toast(`Scheduled card for ${intervalDays} days later`, "success");
    } else if (rating === "easy") {
      intervalDays =
        intervalDays === 0 ? 6 : Math.round(intervalDays * easeFactor);
      easeFactor = easeFactor + 0.15;
      nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);
      toast(`Scheduled card for ${intervalDays} days later`, "success");
    } else if (rating === "archived") {
      toast("Card archived successfully", "success");
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
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          Review Session
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          Card {index + 1} of {cards.length}
        </span>
      </div>

      <div className="space-y-6 text-center">
        <div className="space-y-4">
          <p className="text-3xl font-bold tracking-tight text-foreground select-none">
            {currentCard.originalText}
          </p>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleSpeak}
              aria-label="Pronounce original text"
            >
              🔊
            </Button>
          </div>
        </div>

        {!showAnswer ? (
          <Button
            size="lg"
            className="w-full mt-8"
            onClick={() => setShowAnswer(true)}
          >
            Show Translation
          </Button>
        ) : (
          <div className="space-y-8 pt-4 border-t border-border">
            <div className="space-y-2">
              <p className="text-xl font-bold text-primary font-vazir">
                {currentCard.translation}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Focus Word:{" "}
                <span className="text-destructive font-semibold">
                  {currentCard.focusWord}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                onClick={() => handleSrsAction("hard")}
              >
                Hard
              </Button>
              <Button
                variant="outline"
                className="hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30"
                onClick={() => handleSrsAction("medium")}
              >
                Medium
              </Button>
              <Button
                variant="outline"
                className="hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30"
                onClick={() => handleSrsAction("easy")}
              >
                Easy
              </Button>
              <Button
                variant="outline"
                className="hover:bg-muted/50"
                onClick={() => handleSrsAction("archived")}
              >
                Archive
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
