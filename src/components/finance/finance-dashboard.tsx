"use client";

import React, { useState, useMemo, useEffect } from "react";
import { type FinanceTransaction, type FinanceBudget } from "@/lib/db/client";
import { useToast } from "@/hooks/use-toast";
import { getJalaliDateParts } from "@/lib/utils";
import { useFinanceActions } from "@/hooks/use-finance-actions";
import { StatsCards } from "./stats-cards";
import { TrendChart } from "./trend-chart";
import { BudgetManager } from "./budget-manager";
import { FinanceInsights } from "./finance-insights";
import { CategoryDistribution } from "./category-distribution";

interface FinanceDashboardProps {
  transactions: FinanceTransaction[];
  budgets: FinanceBudget[];
  userId: string;
}

export function FinanceDashboard({
  transactions,
  budgets,
  userId,
}: FinanceDashboardProps) {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<"overview" | "categories" | "budgets">(
    "overview",
  );
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [mounted, setMounted] = useState(false);

  const { setBudget, deleteBudget } = useFinanceActions(userId);

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

  const trends = useMemo(() => {
    const monthlyData: Record<
      string,
      { income: number; expense: number; label: string }
    > = {};
    const now = new Date();
    const currentJalali = getJalaliDateParts(now);
    const monthNames = [
      "فروردین",
      "اردیبهشت",
      "خرداد",
      "تیر",
      "مرداد",
      "شهریور",
      "مهر",
      "آبان",
      "آذر",
      "دی",
      "بهمن",
      "اسفند",
    ];

    for (let i = 5; i >= 0; i--) {
      let m = currentJalali.month - i;
      let y = currentJalali.year;
      if (m < 0) {
        m += 12;
        y -= 1;
      }
      const key = `${y}-${m}`;
      monthlyData[key] = { income: 0, expense: 0, label: monthNames[m] };
    }

    transactions.forEach((tx) => {
      const txDate = new Date(tx.createdAt);
      const { year, month } = getJalaliDateParts(txDate);
      const key = `${year}-${month}`;
      if (monthlyData[key]) {
        const amt = Number(tx.amount);
        if (tx.type === "income") {
          monthlyData[key].income += amt;
        } else {
          monthlyData[key].expense += amt;
        }
      }
    });

    return Object.values(monthlyData);
  }, [transactions]);

  const budgetStatuses = useMemo(() => {
    const nowLocalParts = getJalaliDateParts(new Date());

    return budgets.map((b) => {
      const limit = Number(b.limitAmount);
      const target = b.categoryOrTag.toLowerCase();

      const spent = transactions
        .filter((tx) => {
          if (tx.type !== "expense") return false;
          const matchCategory = tx.category.toLowerCase() === target;
          const matchTag = tx.tags.some(
            (t: string) => t.toLowerCase() === target,
          );

          const txParts = getJalaliDateParts(new Date(tx.createdAt));
          return (
            txParts.month === nowLocalParts.month &&
            txParts.year === nowLocalParts.year
          );
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

    if (!budgetCategory.trim() || isNaN(limitNum) || limitNum <= 0) {
      toast("اطلاعات بودجه نامعتبر است", "error");
      return;
    }

    await setBudget(budgetCategory, limitNum);

    setBudgetCategory("");
    setBudgetLimit("");
    toast("بودجه با موفقیت تنظیم شد", "success");
  };

  const handleDeleteBudget = async (id: string) => {
    await deleteBudget(id);
    toast("بودجه حذف شد", "info");
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = [
      "شناسه",
      "نوع تراکنش",
      "مبلغ",
      "عنوان",
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

  const maxTrendVal = useMemo(() => {
    const vals = trends.flatMap((t) => [t.income, t.expense]);
    const max = Math.max(...vals, 100000);
    return max * 1.1;
  }, [trends]);

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5 bg-muted/50 p-1 border border-border rounded-xl max-w-sm">
        <button
          onClick={() => setSubTab("overview")}
          className={`flex-1 py-1.5 text-[11px] font-semibold font-vazir rounded-lg transition-colors ${
            subTab === "overview"
              ? "bg-background text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          خلاصه وضعیت
        </button>
        <button
          onClick={() => setSubTab("categories")}
          className={`flex-1 py-1.5 text-[11px] font-semibold font-vazir rounded-lg transition-colors ${
            subTab === "categories"
              ? "bg-background text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          تحلیل مخارج
        </button>
        <button
          onClick={() => setSubTab("budgets")}
          className={`flex-1 py-1.5 text-[11px] font-semibold font-vazir rounded-lg transition-colors ${
            subTab === "budgets"
              ? "bg-background text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          بودجه‌بندی
        </button>
      </div>

      <div className="space-y-6">
        {subTab === "overview" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <StatsCards
              income={stats.income}
              expense={stats.expense}
              balance={stats.balance}
              mounted={mounted}
            />
            <TrendChart trends={trends} maxTrendVal={maxTrendVal} />
            <FinanceInsights
              transactions={transactions}
              income={stats.income}
              expense={stats.expense}
            />
          </div>
        )}

        {subTab === "categories" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CategoryDistribution
              categories={stats.categories}
              totalExpense={stats.expense}
              onExportCSV={handleExportCSV}
              mounted={mounted}
            />
          </div>
        )}

        {subTab === "budgets" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <BudgetManager
              budgetCategory={budgetCategory}
              setBudgetCategory={setBudgetCategory}
              budgetLimit={budgetLimit}
              setBudgetLimit={setBudgetLimit}
              handleSetBudget={handleSetBudget}
              budgetStatuses={budgetStatuses}
              handleDeleteBudget={handleDeleteBudget}
              mounted={mounted}
            />
          </div>
        )}
      </div>
    </div>
  );
}
