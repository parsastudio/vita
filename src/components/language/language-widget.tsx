"use client";

import React, { useState, useEffect } from "react";
import { SentenceParser } from "./sentence-parser";
import { SrsReviewer } from "./srs-reviewer";
import { WordList } from "./word-list";
import { SrsSettings } from "./srs-settings";
import { Button } from "@/components/ui/button";
import { formatPersianNumber } from "@/lib/utils";
import { useLanguageData } from "@/hooks/use-language-data";
import { ErrorBoundary } from "@/components/error-boundary";

export function LanguageWidget() {
  const [activeTab, setActiveTabState] = useState<
    "add" | "review" | "list" | "settings"
  >("add");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (
      tabParam === "add" ||
      tabParam === "review" ||
      tabParam === "list" ||
      tabParam === "settings"
    ) {
      setActiveTabState(tabParam);
    }
  }, []);

  const setActiveTab = (tab: "add" | "review" | "list" | "settings") => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tab);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(
        { ...window.history.state, as: newUrl, url: newUrl },
        "",
        newUrl,
      );
    }
  };

  const { cards, reviewCards, nextReviewDate, cardCount, reviewCount, userId } =
    useLanguageData();

  return (
    <div className="w-full bg-transparent sm:bg-card border-y sm:border border-border/40 sm:border-border sm:rounded-2xl shadow-none sm:shadow-sm px-4 py-6 sm:p-8 flex flex-col gap-6 min-h-[480px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-vazir">
            یادگیری هوشمند زبان
          </h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground font-vazir leading-relaxed max-w-lg">
            جعبه لایتنر هوشمند مبتنی بر سیستم رتبه‌بندی FSRS6
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-primary/10 border border-primary/20 text-primary rounded-full px-3 py-1 text-xs font-bold font-vazir">
          <span>{formatPersianNumber(cardCount)}</span>
          <span>کارت فعال</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
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

        <Button
          variant={activeTab === "settings" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("settings")}
          className="font-vazir text-xs font-semibold"
        >
          شخصی‌سازی مرور
        </Button>
      </div>

      <div className="flex-1">
        {activeTab === "add" && (
          <ErrorBoundary
            fallback={
              <div className="p-4 border border-destructive/20 bg-destructive/5 text-destructive rounded-xl text-center font-vazir text-xs">
                خطایی در لود فرم ثبت کلمه رخ داد.
              </div>
            }
          >
            <SentenceParser userId={userId} onSaveSuccess={() => {}} />
          </ErrorBoundary>
        )}

        {activeTab === "review" && (
          <ErrorBoundary
            fallback={
              <div className="p-4 border border-destructive/20 bg-destructive/5 text-destructive rounded-xl text-center font-vazir text-xs">
                خطایی در اجرای صفحه مرور کلمات رخ داد.
              </div>
            }
          >
            <SrsReviewer
              cards={reviewCards}
              nextReviewDate={nextReviewDate}
              onReviewComplete={() => setActiveTab("list")}
            />
          </ErrorBoundary>
        )}

        {activeTab === "list" && (
          <ErrorBoundary
            fallback={
              <div className="p-4 border border-destructive/20 bg-destructive/5 text-destructive rounded-xl text-center font-vazir text-xs">
                خطایی در بارگذاری لیست کلمات رخ داد.
              </div>
            }
          >
            <WordList cards={cards} />
          </ErrorBoundary>
        )}

        {activeTab === "settings" && (
          <ErrorBoundary
            fallback={
              <div className="p-4 border border-destructive/20 bg-destructive/5 text-destructive rounded-xl text-center font-vazir text-xs">
                خطایی در بارگذاری بخش شخصی‌سازی رخ داد.
              </div>
            }
          >
            <SrsSettings />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
