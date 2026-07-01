"use client";

import React, { useState } from "react";
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

  const cards = useLiveQuery(() => {
    const userId = user?.id || "guest";
    return localDb.languageCards.where("userId").equals(userId).toArray();
  }, [user]);

  const reviewCards = React.useMemo<LanguageCard[]>(() => {
    if (!cards) return [];
    const now = new Date();
    return cards.filter((card) => {
      return (
        card.srsStatus !== "archived" && new Date(card.nextReviewAt) <= now
      );
    });
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
          {formatPersianNumber(cardCount)} کارت
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
              {formatPersianNumber(reviewCount)}
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
          <SentenceParser onSaveSuccess={() => setActiveTab("list")} />
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
