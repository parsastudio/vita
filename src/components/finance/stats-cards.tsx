"use client";

import React from "react";
import { formatPersianNumber } from "@/lib/utils";

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
      <div className="p-5 border border-border bg-background rounded-xl">
        <span className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
          کل درآمدها
        </span>
        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
          {mounted ? formatPersianNumber(income) : income} تومان
        </p>
      </div>

      <div className="p-5 border border-border bg-background rounded-xl">
        <span className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
          کل هزینه‌ها
        </span>
        <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
          {mounted ? formatPersianNumber(expense) : expense} تومان
        </p>
      </div>

      <div className="p-5 border border-border bg-background rounded-xl">
        <span className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
          تراز کل مالی
        </span>
        <p
          className={`text-2xl font-bold mt-1 ${
            balance >= 0 ? "text-primary" : "text-destructive"
          }`}
        >
          {mounted ? formatPersianNumber(balance) : balance} تومان
        </p>
      </div>
    </div>
  );
}
