"use client";

import React, { useMemo } from "react";
import { FinanceTransaction } from "@/lib/db/client";
import { formatPersianNumber } from "@/lib/utils";
import { Scale, TrendingUp, Sparkles, Coins } from "lucide-react";

interface FinanceInsightsProps {
  transactions: FinanceTransaction[];
  income: number;
  expense: number;
}

export function FinanceInsights({
  transactions,
  income,
  expense,
}: FinanceInsightsProps) {
  const insights = useMemo(() => {
    const savingRate =
      income > 0 ? Math.max(0, ((income - expense) / income) * 100) : 0;

    const expensesOnly = transactions.filter((t) => t.type === "expense");
    const avgExpense =
      expensesOnly.length > 0
        ? expensesOnly.reduce((sum, t) => sum + Number(t.amount), 0) /
          expensesOnly.length
        : 0;

    let maxExpenseTx: FinanceTransaction | null = null;
    if (expensesOnly.length > 0) {
      maxExpenseTx = expensesOnly.reduce(
        (max, t) => (Number(t.amount) > Number(max.amount) ? t : max),
        expensesOnly[0],
      );
    }

    let healthScore = 50;
    if (income > 0) {
      if (savingRate > 40) healthScore = 95;
      else if (savingRate > 20) healthScore = 80;
      else if (savingRate > 10) healthScore = 65;
      else healthScore = 40;
    } else if (expense > 0) {
      healthScore = 20;
    }

    let statusText = "نیاز به بهبود";
    let statusColor = "text-red-500 bg-red-500/10 border-red-500/20";
    if (healthScore >= 90) {
      statusText = "استثنایی";
      statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    } else if (healthScore >= 75) {
      statusText = "بسیار خوب";
      statusColor = "text-primary bg-primary/10 border-primary/20";
    } else if (healthScore >= 60) {
      statusText = "متعادل";
      statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    }

    return {
      savingRate,
      avgExpense,
      maxExpenseTx,
      healthScore,
      statusText,
      statusColor,
    };
  }, [transactions, income, expense]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 border border-border bg-background rounded-xl flex flex-col justify-between gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-vazir">
              وضعیت سلامت مالی
            </span>
            <h4 className="text-lg font-bold text-foreground font-vazir">
              نرخ پس‌انداز فعال
            </h4>
          </div>
          <div
            className={`px-2.5 py-1 rounded-full border text-xs font-bold font-vazir ${insights.statusColor}`}
          >
            {insights.statusText}
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-foreground tracking-tight">
            {formatPersianNumber(insights.savingRate.toFixed(0))}%
          </span>
          <span className="text-xs text-muted-foreground font-vazir">
            از کل درآمد کسب‌شده
          </span>
        </div>

        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${insights.savingRate}%` }}
          />
        </div>
      </div>

      <div className="p-6 border border-border bg-background rounded-xl space-y-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block font-vazir flex items-center gap-1.5">
          <Sparkles className="size-4 text-primary" />
          پیشنهادات و تحلیل رفتار خرید
        </span>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
            <Scale className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground font-vazir block">
                میانگین هزینه سبد مصرفی
              </span>
              <span className="text-[11px] text-muted-foreground font-vazir block">
                هر خرید ثبت شده به طور میانگین{" "}
                {formatPersianNumber(insights.avgExpense.toFixed(0))} تومان است.
              </span>
            </div>
          </div>

          {insights.maxExpenseTx && (
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
              <TrendingUp className="size-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground font-vazir block">
                  بزرگترین اقلام هزینه‌ای
                </span>
                <span className="text-[11px] text-muted-foreground font-vazir block">
                  رکورد بیشترین مبلغ مربوط به "{insights.maxExpenseTx.category}"
                  با رقم {formatPersianNumber(insights.maxExpenseTx.amount)}{" "}
                  تومان است.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
            <Coins className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-primary font-vazir block">
                توصیه اختصاصی ویتا
              </span>
              <span className="text-[11px] text-muted-foreground font-vazir block leading-relaxed">
                {insights.savingRate >= 20
                  ? "ساختار مالی شما در موقعیت پایدار قرار دارد. برنامه‌ریزی برای سرمایه‌گذاری پیشنهاد می‌شود."
                  : "با کاهش ۱۰ درصدی هزینه‌های متفرقه، نرخ پس‌انداز خود را به محدوده استاندارد نزدیک کنید."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
