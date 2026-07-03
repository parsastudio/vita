"use client";

import React, { useState, useEffect } from "react";
import { QuickEntry } from "./quick-entry";
import { TransactionList } from "./transaction-list";
import { Button } from "@/components/ui/button";
import { formatPersianNumber } from "@/lib/utils";
import { useFinanceData } from "@/hooks/use-finance-data";
import { ErrorBoundary } from "@/components/error-boundary";
import dynamic from "next/dynamic";

const FinanceDashboard = dynamic(
  () => import("./finance-dashboard").then((mod) => mod.FinanceDashboard),
  {
    loading: () => (
      <div className="h-96 bg-muted/20 rounded-2xl animate-pulse flex items-center justify-center text-xs text-muted-foreground font-vazir">
        در حال بارگذاری داشبورد مالی...
      </div>
    ),
    ssr: false,
  },
);

export function FinanceWidget() {
  const [activeTab, setActiveTabState] = useState<"add" | "stats" | "list">(
    "add",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "add" || tabParam === "stats" || tabParam === "list") {
      setActiveTabState(tabParam);
    }
  }, []);

  const setActiveTab = (tab: "add" | "stats" | "list") => {
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

  const { transactions, budgets, txCount, userId } = useFinanceData();

  return (
    <div className="border border-border bg-card rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-vazir text-foreground">
            حسابداری شخصی هوشمند
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ردیابی غیرمتمرکز تراکنش‌ها و مدیریت بودجه ماهانه
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold">
          {formatPersianNumber(txCount)} تراکنش
        </span>
      </div>

      <div className="flex gap-1.5 border-b border-border pb-3">
        <Button
          variant={activeTab === "add" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("add")}
          className="font-vazir text-xs font-semibold"
        >
          ثبت سریع تراکنش
        </Button>

        <Button
          variant={activeTab === "stats" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("stats")}
          className="font-vazir text-xs font-semibold"
        >
          تحلیل و بودجه‌بندی
        </Button>

        <Button
          variant={activeTab === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("list")}
          className="font-vazir text-xs font-semibold"
        >
          دفتر کل معاملات
        </Button>
      </div>

      <div className="flex-1">
        {activeTab === "add" && (
          <ErrorBoundary
            fallback={
              <div className="p-4 border border-destructive/20 bg-destructive/5 text-destructive rounded-xl text-center font-vazir text-xs">
                خطایی در اجرای بخش ثبت سریع تراکنش رخ داد.
              </div>
            }
          >
            <QuickEntry
              transactions={transactions}
              onSaveSuccess={() => setActiveTab("list")}
            />
          </ErrorBoundary>
        )}

        {activeTab === "stats" && (
          <ErrorBoundary
            fallback={
              <div className="p-4 border border-destructive/20 bg-destructive/5 text-destructive rounded-xl text-center font-vazir text-xs">
                خطایی در اجرای داشبورد آماری و بودجه‌بندی رخ داد.
              </div>
            }
          >
            <FinanceDashboard
              transactions={transactions}
              budgets={budgets}
              userId={userId}
            />
          </ErrorBoundary>
        )}

        {activeTab === "list" && (
          <ErrorBoundary
            fallback={
              <div className="p-4 border border-destructive/20 bg-destructive/5 text-destructive rounded-xl text-center font-vazir text-xs">
                خطایی در بارگذاری لیست دفتر کل معاملات رخ داد.
              </div>
            }
          >
            <TransactionList transactions={transactions} />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
