"use client";

import React from "react";
import { formatPersianNumber } from "@/lib/utils";

interface BudgetStatus {
  id: string;
  category: string;
  limit: number;
  spent: number;
  ratio: number;
  percentage: number;
}

interface BudgetManagerProps {
  budgetCategory: string;
  setBudgetCategory: (val: string) => void;
  budgetLimit: string;
  setBudgetLimit: (val: string) => void;
  handleSetBudget: (e: React.FormEvent) => Promise<void>;
  budgetStatuses: BudgetStatus[];
  handleDeleteBudget: (id: string) => Promise<void>;
  mounted: boolean;
}

export function BudgetManager({
  budgetCategory,
  setBudgetCategory,
  budgetLimit,
  setBudgetLimit,
  handleSetBudget,
  budgetStatuses,
  handleDeleteBudget,
  mounted,
}: BudgetManagerProps) {
  return (
    <div className="p-6 border border-border bg-background rounded-xl space-y-6">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-vazir">
        مدیریت بودجه‌های ماهانه
      </h3>

      <form
        onSubmit={handleSetBudget}
        className="flex flex-col sm:flex-row gap-2.5 w-full items-stretch sm:items-center"
      >
        <input
          type="text"
          required
          value={budgetCategory}
          onChange={(e) => setBudgetCategory(e.target.value)}
          placeholder="عنوان یا برچسب"
          className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir min-w-0"
        />
        <input
          type="number"
          required
          value={budgetLimit}
          onChange={(e) => setBudgetLimit(e.target.value)}
          placeholder="سقف بودجه"
          className="w-full sm:w-28 h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir min-w-0"
        />
        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/80 text-primary-foreground text-xs font-bold font-vazir cursor-pointer shrink-0"
        >
          تنظیم بودجه
        </button>
      </form>

      <div className="space-y-4 max-h-[220px] overflow-y-auto pe-1">
        {budgetStatuses.map((b) => (
          <div
            key={b.id}
            className="space-y-1.5 p-3 border border-border rounded-lg bg-card/40"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground font-vazir">
                  {b.category}
                </span>
                {b.ratio >= 1.0 ? (
                  <span className="text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold animate-pulse font-vazir">
                    تجاوز از سقف بودجه
                  </span>
                ) : b.ratio >= 0.8 ? (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold animate-pulse font-vazir">
                    نزدیک به سقف (۸۰٪+)
                  </span>
                ) : null}
              </div>
              <button
                onClick={() => handleDeleteBudget(b.id)}
                className="text-muted-foreground hover:text-destructive text-[10px] transition-colors font-vazir cursor-pointer"
              >
                حذف
              </button>
            </div>

            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  b.ratio >= 1.0
                    ? "bg-red-500"
                    : b.ratio >= 0.8
                      ? "bg-amber-500"
                      : "bg-primary"
                }`}
                style={{ width: `${b.percentage}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground font-vazir">
              <span>
                {mounted
                  ? formatPersianNumber(b.spent.toFixed(0))
                  : b.spent.toFixed(0)}{" "}
                تومان هزینه شده
              </span>
              <span>
                سقف:{" "}
                {mounted
                  ? formatPersianNumber(b.limit.toFixed(0))
                  : b.limit.toFixed(0)}{" "}
                تومان
              </span>
            </div>
          </div>
        ))}

        {budgetStatuses.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground font-vazir">
            هیچ بودجه فعالی ثبت نشده است. از فیلد بالا اضافه کنید!
          </div>
        )}
      </div>
    </div>
  );
}
