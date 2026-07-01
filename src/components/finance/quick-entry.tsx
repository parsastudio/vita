"use client";

import React, { useState, useMemo, useEffect } from "react";
import { localDb, type FinanceTransaction } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPersianNumber } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface PresetQuick {
  label: string;
  amount: number;
  type: "income" | "expense";
  category: string;
}

const PRESET_QUICKS: PresetQuick[] = [
  { label: "قهوه", amount: 50000, type: "expense", category: "خوراک" },
  { label: "تاکسی", amount: 40000, type: "expense", category: "رفت و آمد" },
  { label: "حقوق", amount: 25000000, type: "income", category: "حقوق" },
  { label: "سوپرمارکت", amount: 150000, type: "expense", category: "خوراک" },
];

function toEnglishDigits(str: string): string {
  const persianDigits = [
    /۰/g,
    /۱/g,
    /۲/g,
    /۳/g,
    /۴/g,
    /۵/g,
    /۶/g,
    /۷/g,
    /۸/g,
    /۹/g,
  ];
  const arabicDigits = [
    /٠/g,
    /١/g,
    /٢/g,
    /٣/g,
    /٤/g,
    /٥/g,
    /٦/g,
    /٧/g,
    /٨/g,
    /٩/g,
  ];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result
      .replace(persianDigits[i], String(i))
      .replace(arabicDigits[i], String(i));
  }
  return result;
}

export function QuickEntry({
  transactions,
  onSaveSuccess,
}: {
  transactions: FinanceTransaction[];
  onSaveSuccess: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [nlpText, setNlpText] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [description, setDescription] = useState("");
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);

  const parsedNlp = useMemo(() => {
    if (!nlpText.trim()) return null;
    const normalizedText = toEnglishDigits(nlpText);
    const words = normalizedText.split(/\s+/).filter(Boolean);
    let parsedAmount = 0;
    let parsedType: "income" | "expense" = "expense";
    let detectedTags: string[] = [];

    for (const word of words) {
      const num = parseFloat(word.replace(/,/g, ""));
      if (!isNaN(num) && num > 0) {
        parsedAmount = num;
      } else {
        const lower = word.toLowerCase();
        if (
          [
            "income",
            "salary",
            "earn",
            "deposit",
            "gift",
            "حقوق",
            "درآمد",
            "واریز",
          ].includes(lower)
        ) {
          parsedType = "income";
        } else {
          detectedTags.push(word);
        }
      }
    }

    const parsedCategory = detectedTags[0] || "عمومی";
    return {
      amount: parsedAmount,
      type: parsedType,
      category: parsedCategory,
      tags: detectedTags,
      description: nlpText,
    };
  }, [nlpText]);

  const dynamicQuickActions = useMemo<PresetQuick[]>(() => {
    if (!transactions || transactions.length === 0) return PRESET_QUICKS;
    const recentTxs = transactions.slice(-100);
    const freqMap: Record<string, { count: number; tx: FinanceTransaction }> =
      {};
    recentTxs.forEach((tx) => {
      const key = `${tx.category}-${tx.amount}-${tx.type}`;
      if (!freqMap[key]) {
        freqMap[key] = { count: 0, tx };
      }
      freqMap[key].count += 1;
    });

    const sorted = Object.values(freqMap).sort((a, b) => b.count - a.count);
    const result = sorted.slice(0, 4).map((item) => ({
      label: item.tx.category,
      amount: item.tx.amount,
      type: item.tx.type,
      category: item.tx.category,
    }));

    return result.length < 4
      ? [...result, ...PRESET_QUICKS.slice(0, 4 - result.length)]
      : result;
  }, [transactions]);

  useEffect(() => {
    const amtVal = parseFloat(toEnglishDigits(amount));
    if (isNaN(amtVal) || amtVal <= 0 || !category.trim()) {
      setBudgetWarning(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      if (type !== "expense") {
        setBudgetWarning(null);
        return;
      }
      const userId = user?.id || "guest";
      const budget = await localDb.financeBudgets
        .where("userId")
        .equals(userId)
        .filter(
          (b) =>
            b.categoryOrTag.toLowerCase() === category.trim().toLowerCase(),
        )
        .first();

      if (budget) {
        const limit = Number(budget.limitAmount);
        const currentMonthExpenses = transactions
          .filter((tx) => {
            if (tx.type !== "expense") return false;
            if (tx.category.toLowerCase() !== category.trim().toLowerCase())
              return false;
            const txDate = new Date(tx.createdAt);
            const now = new Date();
            return (
              txDate.getMonth() === now.getMonth() &&
              txDate.getFullYear() === now.getFullYear()
            );
          })
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const nextTotal = currentMonthExpenses + amtVal;
        if (nextTotal >= limit * 0.8) {
          setBudgetWarning(
            `هشدار: با ثبت این تراکنش، مخارج شما به ${((nextTotal / limit) * 100).toFixed(0)}٪ از سقف بودجه تعیین شده (${formatPersianNumber(limit)} تومان) برای دسته‌بندی "${category}" خواهد رسید.`,
          );
        } else {
          setBudgetWarning(null);
        }
      } else {
        setBudgetWarning(null);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [amount, category, type, transactions, user]);

  const handleNlpApply = async () => {
    if (!parsedNlp || parsedNlp.amount <= 0) return;
    const userId = user?.id || "guest";
    const txId = uuidv4();

    await localDb.financeTransactions.put({
      id: txId,
      userId,
      amount: parsedNlp.amount,
      type: parsedNlp.type,
      category: parsedNlp.category,
      tags: parsedNlp.tags,
      description: parsedNlp.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    });

    setNlpText("");
    toast("تراکنش به کمک دستیار هوشمند با موفقیت ثبت شد", "success");
    onSaveSuccess();
  };

  const handlePresetClick = async (preset: PresetQuick) => {
    const userId = user?.id || "guest";
    const txId = uuidv4();

    await localDb.financeTransactions.put({
      id: txId,
      userId,
      amount: preset.amount,
      type: preset.type,
      category: preset.category,
      tags: [preset.category],
      description: `ثبت سریع برای ${preset.label}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    });

    toast(`تراکنش ثبت سریع "${preset.label}" انجام شد`, "success");
    onSaveSuccess();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(toEnglishDigits(amount));
    if (isNaN(numAmt) || numAmt <= 0 || !category.trim()) return;

    const userId = user?.id || "guest";
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await localDb.financeTransactions.put({
      id: uuidv4(),
      userId,
      amount: numAmt,
      type,
      category: category.trim(),
      tags: tags.length > 0 ? tags : [category.trim()],
      description: description.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    });

    setAmount("");
    setCategory("");
    setTagsInput("");
    setDescription("");
    setBudgetWarning(null);
    toast("تراکنش با موفقیت ثبت شد", "success");
    onSaveSuccess();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 p-5 bg-gradient-to-r from-primary/5 via-violet-500/5 to-indigo-500/5 rounded-2xl border border-primary/10 backdrop-blur-md transition-all duration-300 hover:border-primary/20">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider font-vazir">
            دستیار صوتی و متنی هوشمند ویتا
          </label>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            پردازشگر طبیعی کلمات
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nlpText}
            onChange={(e) => setNlpText(e.target.value)}
            placeholder="بنویسید مثلاً: ۵۰۰۰۰ تاکسی کار یا ۱۲۰۰۰۰۰ حقوق واریز..."
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
          />
          {parsedNlp && parsedNlp.amount > 0 && (
            <Button type="button" onClick={handleNlpApply}>
              ثبت هوشمند
            </Button>
          )}
        </div>

        {parsedNlp && parsedNlp.amount > 0 && (
          <div className="p-4 bg-card/60 backdrop-blur-sm rounded-xl border border-primary/20 flex items-center justify-between text-xs transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <span className="font-medium text-muted-foreground">
                تشخیص سیستم:
              </span>{" "}
              <span
                className={`font-bold ${parsedNlp.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
              >
                {parsedNlp.type === "income" ? "+" : "-"}
                {formatPersianNumber(parsedNlp.amount)} تومان
              </span>{" "}
              در دسته‌بندی{" "}
              <span className="font-semibold text-foreground">
                {parsedNlp.category}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              آماده ثبت نهایی
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block font-vazir">
          تراکنش‌های پرتکرار (ثبت با یک کلیک)
        </span>
        <div className="flex flex-wrap gap-2">
          {dynamicQuickActions.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className="px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted text-xs text-foreground font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span
                className={
                  preset.type === "income"
                    ? "text-green-600 font-bold"
                    : "text-red-600 font-bold"
                }
              >
                {preset.type === "income" ? "↓" : "↑"}
              </span>
              <span>{preset.label}</span>
              <span className="text-muted-foreground font-bold">
                {formatPersianNumber(preset.amount)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleManualSubmit}
        className="space-y-5 pt-4 border-t border-border"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block font-vazir">
          فرم ثبت تراکنش تفصیلی
        </span>

        {budgetWarning && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-medium leading-relaxed">
            ⚠️ {budgetWarning}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              مبلغ (تومان)
            </label>
            <input
              type="text"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              نوع تراکنش
            </label>
            <div className="grid grid-cols-2 gap-2 h-10">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  type === "expense"
                    ? "border-red-500/30 bg-red-500/5 text-red-600"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                هزینه
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  type === "income"
                    ? "border-green-500/30 bg-green-500/5 text-green-600"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                درآمد
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              دسته‌بندی اصلی
            </label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="مثال: خوراک، قبض آب، کرایه خانه"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              برچسب‌ها (با کاما جدا کنید)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="مثال: ناهار، رستوران"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            توضیحات اختیاری
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="جزئیات بیشتر..."
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
          />
        </div>

        <Button type="submit" className="w-full">
          ذخیره و ثبت در دفتر مالی
        </Button>
      </form>
    </div>
  );
}
