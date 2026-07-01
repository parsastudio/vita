"use client";

import React, { useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab =
    (searchParams.get("tab") as "add" | "review" | "list") || "add";

  const setActiveTab = (tab: "add" | "review" | "list") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const userId = user?.id || "guest";

  const cards = useLiveQuery(() => {
    return localDb.languageCards.where("userId").equals(userId).toArray();
  }, [userId]);

  const reviewCards = useMemo<LanguageCard[]>(() => {
    if (!cards || cards.length === 0) return [];
    const activeCards = cards.filter((card) => card.srsStatus === "active");
    if (activeCards.length === 0) return [];

    const now = new Date();
    const priorityCards = activeCards.map((card) => {
      const lastReviewed = new Date(card.updatedAt);
      const hoursSince = Math.max(
        0,
        (now.getTime() - lastReviewed.getTime()) / (1000 * 60 * 60),
      );
      const priority = card.difficulty * Math.log(2 + hoursSince);
      return { card, priority };
    });

    return priorityCards
      .sort((a, b) => b.priority - a.priority)
      .map((item) => item.card);
  }, [cards]);

  const cardCount = cards?.length || 0;
  const reviewCount = reviewCards.length;

  return (
    <div className="border border-border bg-card rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-vazir">
            یادگیری هوشمند زبان
          </h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground font-vazir leading-relaxed max-w-lg">
            جعبه لایتنر هوشمند تطبیقی مبتنی بر اولویت‌بندی لگاریتمی و سختی متغیر
            کلمات
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-primary/10 border border-primary/20 text-primary rounded-full px-3 py-1 text-xs font-bold font-vazir">
          <span>{formatPersianNumber(cardCount)}</span>
          <span>کارت فعال</span>
        </div>
      </div>

      <div className="flex gap-1.5 border-b border-border pb-3">
        <Button
          variant={activeTab === "add" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("add")}
          className="font-vazir text-xs font-semibold"
        >
          افزودن کارت جمله
        </Button>

        <Button
          variant={activeTab === "review" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("review")}
          className="relative font-vazir text-xs font-semibold"
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
          className="font-vazir text-xs font-semibold"
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
