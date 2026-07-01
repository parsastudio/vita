"use client";

import React, { useState, useMemo, useEffect } from "react";
import { localDb, type FinanceTransaction } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPersianNumber, getJalaliDateParts } from "@/lib/utils";
import { parseNaturalLanguageTransaction, toEnglishDigits } from "@/lib/nlp";
import { v4 as uuidv4 } from "uuid";
import { Sparkles, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";
import { z } from "zod";

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

const formSchema = z.object({
  amount: z.string().refine(
    (val) => {
      const parsed = parseFloat(toEnglishDigits(val).replace(/,/g, ""));
      return !isNaN(parsed) && parsed > 0;
    },
    { message: "مبلغ وارد شده باید عددی بزرگتر از صفر باشد" },
  ),
  category: z.string().min(1, "انتخاب دسته‌بندی الزامی است"),
  type: z.enum(["income", "expense"]),
  tagsInput: z.string().optional(),
  description: z.string().optional(),
});

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
  const [validationError, setValidationError] = useState<string | null>(null);

  const parsedNlp = useMemo(() => {
    return parseNaturalLanguageTransaction(nlpText);
  }, [nlpText]);

  const amountSuggestions = useMemo(() => {
    const amtVal = parseFloat(toEnglishDigits(amount).replace(/,/g, ""));
    if (
      isNaN(amtVal) ||
      amtVal <= 0 ||
      !transactions ||
      transactions.length === 0
    )
      return [];

    const similar = transactions.filter((tx) => {
      const diff = Math.abs(Number(tx.amount) - amtVal);
      const threshold = amtVal * 0.15;
      return diff <= threshold;
    });

    const uniqueSuggestions: Array<{
      category: string;
      tags: string[];
      description: string;
    }> = [];
    const seenCategories = new Set<string>();

    for (const tx of similar) {
      const catKey = tx.category.trim().toLowerCase();
      if (!seenCategories.has(catKey)) {
        seenCategories.add(catKey);
        uniqueSuggestions.push({
          category: tx.category,
          tags: tx.tags,
          description: tx.description || "",
        });
      }
      if (uniqueSuggestions.length >= 3) break;
    }

    return uniqueSuggestions;
  }, [amount, transactions]);

  const dynamicQuickActions = useMemo<PresetQuick[]>(() => {
    if (!transactions || transactions.length === 0) {
      return PRESET_QUICKS.map((p) => ({
        ...p,
        label: `${p.label} - ${formatPersianNumber(p.amount)} تومان`,
      }));
    }
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
    const result = sorted.slice(0, 4).map((item) => {
      const displayLabel = item.tx.description || item.tx.category;
      return {
        label: `${displayLabel} - ${formatPersianNumber(item.tx.amount)} تومان`,
        amount: item.tx.amount,
        type: item.tx.type,
        category: item.tx.category,
      };
    });

    if (result.length < 4) {
      const remaining = PRESET_QUICKS.slice(0, 4 - result.length).map((p) => ({
        ...p,
        label: `${p.label} - ${formatPersianNumber(p.amount)} تومان`,
      }));
      return [...result, ...remaining];
    }

    return result;
  }, [transactions]);

  useEffect(() => {
    const amtVal = parseFloat(toEnglishDigits(amount).replace(/,/g, ""));
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
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const budget = await localDb.financeBudgets
        .where("userId")
        .equals(userId)
        .filter(
          (b) =>
            b.categoryOrTag.toLowerCase() === category.trim().toLowerCase() ||
            tags.includes(b.categoryOrTag.toLowerCase()),
        )
        .first();

      if (budget) {
        const limit = Number(budget.limitAmount);
        const currentMonthExpenses = transactions
          .filter((tx) => {
            if (tx.type !== "expense") return false;
            const matchCategory =
              tx.category.toLowerCase() === budget.categoryOrTag.toLowerCase();
            const matchTag = tx.tags.some(
              (t) => t.toLowerCase() === budget.categoryOrTag.toLowerCase(),
            );
            if (!matchCategory && !matchTag) return false;

            const txDate = new Date(tx.createdAt);
            const now = new Date();

            const txParts = getJalaliDateParts(txDate);
            const nowParts = getJalaliDateParts(now);

            return (
              txParts.month === nowParts.month && txParts.year === nowParts.year
            );
          })
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const nextTotal = currentMonthExpenses + amtVal;
        if (nextTotal >= limit * 0.8) {
          setBudgetWarning(
            `هشدار: با ثبت این تراکنش، مخارج شما به ${((nextTotal / limit) * 100).toFixed(0)}٪ از سقف بودجه تعیین شده (${formatPersianNumber(limit)} تومان) برای دسته‌بندی یا تگ "${budget.categoryOrTag}" خواهد رسید.`,
          );
        } else {
          setBudgetWarning(null);
        }
      } else {
        setBudgetWarning(null);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [amount, category, tagsInput, type, transactions, user]);

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

  const handleNlpToForm = () => {
    if (!parsedNlp || parsedNlp.amount <= 0) return;
    setAmount(parsedNlp.amount.toLocaleString("en-US"));
    setType(parsedNlp.type);
    setCategory(parsedNlp.category);
    setTagsInput(parsedNlp.tags.join(", "));
    setDescription(parsedNlp.description);
    setNlpText("");
    toast("اطلاعات پردازش شده با موفقیت در فرم بارگذاری شد", "info");
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
      description: `ثبت سریع برای ${preset.label.split(" - ")[0]}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    });

    toast(
      `تراکنش ثبت سریع "${preset.label.split(" - ")[0]}" انجام شد`,
      "success",
    );
    onSaveSuccess();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const validation = formSchema.safeParse({
      amount,
      category,
      type,
      tagsInput,
      description,
    });

    if (!validation.success) {
      setValidationError(validation.error.errors[0].message);
      return;
    }

    const numAmt = parseFloat(toEnglishDigits(amount).replace(/,/g, ""));
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

  const applySuggestion = (sug: {
    category: string;
    tags: string[];
    description: string;
  }) => {
    setCategory(sug.category);
    setTagsInput(sug.tags.join(", "));
    setDescription(sug.description);
    toast(
      `دسته‌بندی و تگ بر اساس مبلغ به عنوان "${sug.category}" اعمال شد`,
      "info",
    );
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = toEnglishDigits(e.target.value).replace(/[^0-9]/g, "");
    if (rawVal === "") {
      setAmount("");
      return;
    }
    const parsed = parseInt(rawVal, 10);
    if (isNaN(parsed)) return;
    setAmount(parsed.toLocaleString("en-US"));
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 p-5 bg-gradient-to-r from-primary/5 via-violet-500/5 to-indigo-500/5 rounded-2xl border border-primary/10 backdrop-blur-md transition-all duration-300 hover:border-primary/20">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider font-vazir flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary animate-pulse" />
            دستیار صوتی و متنی هوشمند ویتا
          </label>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium font-vazir">
            پردازشگر طبیعی کلمات
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nlpText}
            onChange={(e) => setNlpText(e.target.value)}
            placeholder="بنویسید مثلاً: ۵۰ هزار تاکسی یا ۴.۵ میلیون حقوق واریز..."
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
          />
          {parsedNlp && parsedNlp.amount > 0 && (
            <div className="flex gap-1">
              <Button type="button" onClick={handleNlpToForm} variant="outline">
                اعمال روی فرم
              </Button>
              <Button type="button" onClick={handleNlpApply}>
                ثبت مستقیم
              </Button>
            </div>
          )}
        </div>

        {parsedNlp && parsedNlp.amount > 0 && (
          <div className="p-4 bg-card/60 backdrop-blur-sm rounded-xl border border-primary/20 flex items-center justify-between text-xs transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="font-vazir">
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
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold font-vazir">
              آماده اقدام
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
              className="px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted text-xs text-foreground font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer font-vazir"
            >
              <span className="font-bold">
                {preset.type === "income" ? (
                  <ArrowDown className="size-3 text-green-600 inline-block" />
                ) : (
                  <ArrowUp className="size-3 text-red-600 inline-block" />
                )}
              </span>
              <span>{preset.label}</span>
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

        {validationError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium leading-relaxed font-vazir flex items-start gap-1.5">
            <AlertTriangle className="size-4 shrink-0 text-red-500 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {budgetWarning && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-medium leading-relaxed font-vazir flex items-start gap-1.5 animate-in fade-in duration-300">
            <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
            <span>{budgetWarning}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
              مبلغ (تومان)
            </label>
            <input
              type="text"
              required
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir ltr"
            />

            {amountSuggestions.length > 0 && (
              <div className="pt-2 animate-in fade-in duration-200">
                <span className="text-[10px] font-semibold text-muted-foreground block mb-1 font-vazir">
                  حدس دسته‌بندی بر اساس مبلغ وارد شده:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {amountSuggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applySuggestion(sug)}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/15 transition-all cursor-pointer font-vazir"
                    >
                      {sug.category}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
              نوع تراکنش
            </label>
            <div className="grid grid-cols-2 gap-2 h-10">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`rounded-lg border text-xs font-semibold transition-all cursor-pointer font-vazir ${
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
                className={`rounded-lg border text-xs font-semibold transition-all cursor-pointer font-vazir ${
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
            <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
              دسته‌بندی اصلی
            </label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="مثال: خوراک، قبض آب، کرایه خانه"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
              برچسب‌ها (با کاما جدا کنید)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="مثال: ناهار، رستوران"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
            توضیجات اختیاری
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="جزئیات بیشتر..."
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
          />
        </div>

        <Button type="submit" className="w-full font-vazir">
          ذخیره و ثبت در دفتر مالی
        </Button>
      </form>
    </div>
  );
}
