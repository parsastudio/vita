"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb, type LanguageCard } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { SentenceParser } from "./sentence-parser";
import { SrsReviewer } from "./srs-reviewer";
import { WordList } from "./word-list";
import { Button } from "@/components/ui/button";
import { formatPersianNumber } from "@/lib/utils";

export function LanguageWidget() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"add" | "review" | "list">("add");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userId = user?.id || "guest";

  const cards = useLiveQuery(() => {
    return localDb.languageCards.where("userId").equals(userId).toArray();
  }, [userId]);

  const reviewCards = useMemo<LanguageCard[]>(() => {
    if (!cards || cards.length === 0) return [];
    const now = new Date();
    const activeCards = cards.filter((card) => card.srsStatus !== "archived");
    if (activeCards.length === 0) return [];

    const strictlyDue = activeCards.filter(
      (card) => new Date(card.nextReviewAt) <= now,
    );
    if (strictlyDue.length > 0) {
      return strictlyDue;
    }

    return [...activeCards].sort(
      (a, b) =>
        new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime(),
    );
  }, [cards]);

  const cardCount = cards?.length || 0;
  const reviewCount = reviewCards.length;

  return (
    <div className="border border-border bg-card rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-vazir text-foreground">
            یادگیری هوشمند زبان
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            جعبه مرور لایتنر هوشمند (SRS) غیرمتمرکز
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold">
          {mounted ? formatPersianNumber(cardCount) : cardCount} کارت
        </span>
      </div>

      <div className="flex gap-1.5 border-b border-border pb-3">
        <Button
          variant={activeTab === "add" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("add")}
          className="font-vazir text-xs"
        >
          افزودن کارت جمله
        </Button>

        <Button
          variant={activeTab === "review" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("review")}
          className="relative font-vazir text-xs"
        >
          مرور کارت‌ها
          {reviewCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-[9px] text-white flex items-center justify-center rounded-full font-bold">
              {mounted ? formatPersianNumber(reviewCount) : reviewCount}
            </span>
          )}
        </Button>

        <Button
          variant={activeTab === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("list")}
          className="font-vazir text-xs"
        >
          لیست کارت‌ها
        </Button>
      </div>

      <div className="flex-1">
        {activeTab === "add" && (
          <SentenceParser
            userId={userId}
            onSaveSuccess={() => setActiveTab("list")}
          />
        )}

        {activeTab === "review" && (
          <SrsReviewer
            cards={reviewCards}
            onReviewComplete={() => setActiveTab("list")}
          />
        )}

        {activeTab === "list" && <WordList cards={cards || []} />}
      </div>
    </div>
  );
}
