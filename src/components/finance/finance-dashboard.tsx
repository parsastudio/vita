"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  localDb,
  type FinanceTransaction,
  type FinanceBudget,
} from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPersianNumber } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

export function FinanceDashboard({
  transactions,
  budgets,
}: {
  transactions: FinanceTransaction[];
  budgets: FinanceBudget[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const categoryTotals: Record<string, number> = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount);
      if (tx.type === "income") {
        income += amt;
      } else {
        expense += amt;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amt;
      }
    });

    const categoriesArray = Object.entries(categoryTotals).map(
      ([name, val]) => ({
        name,
        value: val,
        percentage: expense > 0 ? (val / expense) * 100 : 0,
      }),
    );

    return {
      income,
      expense,
      balance: income - expense,
      categories: categoriesArray,
    };
  }, [transactions]);

  const budgetStatuses = useMemo(() => {
    return budgets.map((b) => {
      const limit = Number(b.limitAmount);
      const target = b.categoryOrTag.toLowerCase();

      const spent = transactions
        .filter((tx) => {
          if (tx.type !== "expense") return false;
          const matchCategory = tx.category.toLowerCase() === target;
          const matchTag = tx.tags.some((t) => t.toLowerCase() === target);
          return matchCategory || matchTag;
        })
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const ratio = limit > 0 ? spent / limit : 0;
      return {
        id: b.id,
        category: b.categoryOrTag,
        limit,
        spent,
        ratio,
        percentage: Math.min(100, ratio * 100),
      };
    });
  }, [budgets, transactions]);

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(budgetLimit);
    if (!budgetCategory.trim() || isNaN(limitNum) || limitNum <= 0) return;

    const userId = user?.id || "guest";
    const existing = await localDb.financeBudgets
      .where("userId")
      .equals(userId)
      .filter(
        (b) =>
          b.categoryOrTag.toLowerCase() === budgetCategory.trim().toLowerCase(),
      )
      .first();

    await localDb.financeBudgets.put({
      id: existing?.id || uuidv4(),
      userId,
      categoryOrTag: budgetCategory.trim(),
      limitAmount: limitNum,
      period: "monthly",
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
      synced: false,
    });

    setBudgetCategory("");
    setBudgetLimit("");
    toast("بودجه دسته‌بندی با موفقیت تنظیم شد", "success");
  };

  const handleDeleteBudget = async (id: string) => {
    await localDb.transaction(
      "rw",
      [localDb.financeBudgets, localDb.deletedRecords],
      async () => {
        await localDb.financeBudgets.delete(id);
        await localDb.deletedRecords.put({
          id,
          tableName: "financeBudgets",
          deletedAt: new Date(),
          synced: false,
        });
      },
    );
    toast("بودجه دسته‌بندی حذف شد", "info");
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = [
      "شناسه",
      "نوع تراکنش",
      "مبلغ",
      "دسته‌بندی",
      "برچسب‌ها",
      "توضیحات",
      "تاریخ ثبت",
    ];
    const rows = transactions.map((tx) => [
      tx.id,
      tx.type === "income" ? "درآمد" : "هزینه",
      tx.amount,
      tx.category,
      (tx.tags || []).join("; "),
      (tx.description || "").replace(/"/g, '""'),
      new Date(tx.createdAt).toISOString(),
    ]);

    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((e) => e.map((val) => `"${val}"`).join(",")),
      ].join("\n");

    const encodedUri =
      "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `vita_ledger_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("خروجی اکسل با موفقیت دریافت شد", "success");
  };

  const donutSegments = useMemo(() => {
    let accumulatedPercent = 0;
    const colors = [
      "#8B5CF6",
      "#10B981",
      "#3B82F6",
      "#F59E0B",
      "#EF4444",
      "#EC4899",
      "#6B7280",
    ];
    return stats.categories.map((cat, idx) => {
      const currentPercent = cat.percentage;
      const strokeDashoffset = 100 - accumulatedPercent;
      accumulatedPercent += currentPercent;
      return {
        ...cat,
        color: colors[idx % colors.length],
        strokeDashoffset,
        strokeDasharray: `${currentPercent} ${100 - currentPercent}`,
      };
    });
  }, [stats]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 border border-border bg-background rounded-xl">
          <span className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
            کل درآمدها
          </span>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {mounted ? formatPersianNumber(stats.income) : stats.income} تومان
          </p>
        </div>

        <div className="p-5 border border-border bg-background rounded-xl">
          <span className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
            کل هزینه‌ها
          </span>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {mounted ? formatPersianNumber(stats.expense) : stats.expense} تومان
          </p>
        </div>

        <div className="p-5 border border-border bg-background rounded-xl">
          <span className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
            تراز کل مالی
          </span>
          <p
            className={`text-2xl font-bold mt-1 ${stats.balance >= 0 ? "text-primary" : "text-destructive"}`}
          >
            {mounted ? formatPersianNumber(stats.balance) : stats.balance} تومان
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="p-6 border border-border bg-background rounded-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-vazir">
              سهم دسته‌بندی هزینه‌ها
            </h3>
            <Button
              variant="outline"
              size="xs"
              onClick={handleExportCSV}
              className="font-vazir text-xs"
            >
              خروجی اکسل
            </Button>
          </div>

          {stats.categories.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
              <div className="relative w-36 h-36 shrink-0">
                <svg
                  viewBox="0 0 36 36"
                  className="w-full h-full transform -rotate-90"
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="transparent"
                    strokeWidth="3"
                  />
                  {donutSegments.map((seg, idx) => (
                    <circle
                      key={idx}
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="3.2"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="transition-all duration-500 ease-out"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold font-vazir">
                    کل خرج‌ها
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {mounted
                      ? formatPersianNumber(stats.expense)
                      : stats.expense}
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-2">
                {donutSegments.map((seg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="font-medium text-foreground font-vazir">
                        {seg.name}
                      </span>
                    </div>
                    <div className="text-start text-muted-foreground font-vazir">
                      <span className="font-semibold text-foreground">
                        {mounted ? formatPersianNumber(seg.value) : seg.value}{" "}
                        تومان
                      </span>{" "}
                      (
                      {mounted
                        ? formatPersianNumber(seg.percentage.toFixed(0))
                        : seg.percentage.toFixed(0)}
                      ٪)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground font-vazir">
              هنوز هزینه‌ای ثبت نشده است تا سهم دسته‌بندی رندر شود.
            </div>
          )}
        </div>

        <div className="p-6 border border-border bg-background rounded-xl space-y-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-vazir">
            مدیریت بودجه‌های ماهانه
          </h3>

          <form onSubmit={handleSetBudget} className="flex gap-2">
            <input
              type="text"
              required
              value={budgetCategory}
              onChange={(e) => setBudgetCategory(e.target.value)}
              placeholder="دسته‌بندی یا برچسب"
              className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
            />
            <input
              type="number"
              required
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              placeholder="سقف بودجه"
              className="w-32 h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
            />
            <Button type="submit" size="sm" className="font-vazir text-xs">
              تنظیم
            </Button>
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
                    {b.ratio >= 0.8 && (
                      <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse font-vazir">
                        هشدار مصرف
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteBudget(b.id)}
                    className="text-muted-foreground hover:text-destructive text-[10px] transition-colors font-vazir"
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
      </div>
    </div>
  );
}
