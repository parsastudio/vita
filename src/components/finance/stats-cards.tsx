"use client";

import React from "react";
import { formatPersianNumber } from "@/lib/utils";
import { ArrowUpLeft, ArrowDownRight, Wallet } from "lucide-react";

interface StatsCardsProps {
  income: number;
  expense: number;
  balance: number;
  mounted: boolean;
}

export function StatsCards({
  income,
  expense,
  balance,
  mounted,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-5 border border-border bg-background rounded-xl flex items-center justify-between gap-4 transition-all hover:border-border/80">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-vazir">
            کل درآمدهای ثبت‌شده
          </span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {mounted ? formatPersianNumber(income) : income} تومان
          </p>
        </div>
        <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
          <ArrowDownRight className="size-5" />
        </div>
      </div>

      <div className="p-5 border border-border bg-background rounded-xl flex items-center justify-between gap-4 transition-all hover:border-border/80">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-vazir">
            کل هزینه‌های جاری
          </span>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
            {mounted ? formatPersianNumber(expense) : expense} تومان
          </p>
        </div>
        <div className="size-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
          <ArrowUpLeft className="size-5" />
        </div>
      </div>

      <div className="p-5 border border-border bg-background rounded-xl flex items-center justify-between gap-4 transition-all hover:border-border/80">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-vazir">
            تراز مالی کل
          </span>
          <p
            className={`text-xl font-bold ${balance >= 0 ? "text-primary" : "text-destructive"}`}
          >
            {mounted ? formatPersianNumber(balance) : balance} تومان
          </p>
        </div>
        <div
          className={`size-10 rounded-full flex items-center justify-center shrink-0 ${balance >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
        >
          <Wallet className="size-5" />
        </div>
      </div>
    </div>
  );
}
