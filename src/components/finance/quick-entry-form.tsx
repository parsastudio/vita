"use client";

import React, { useState, useEffect, useMemo } from "react";
import { localDb, type FinanceTransaction } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { formatPersianNumber, getJalaliDateParts } from "@/lib/utils";
import { toEnglishDigits } from "@/lib/nlp";
import { AlertTriangle } from "lucide-react";
import { z } from "zod";

const formSchema = z.object({
  amount: z.string().refine(
    (val) => {
      const parsed = parseFloat(toEnglishDigits(val).replace(/,/g, ""));
      return !isNaN(parsed) && parsed > 0;
    },
    { message: "مبلغ وارد شده باید عددی بزرگتر از صفر باشد" },
  ),
  category: z.string().min(1, "عنوان تراکنش الزامی است"),
  type: z.enum(["income", "expense"]),
  tagsInput: z.string().optional(),
  description: z.string().optional(),
});

interface QuickEntryFormProps {
  userId: string;
  transactions: FinanceTransaction[];
  amount: string;
  setAmount: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  type: "income" | "expense";
  setType: (val: "income" | "expense") => void;
  tagsInput: string;
  setTagsInput: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  onSave: (amountNum: number, tags: string[]) => Promise<void>;
  toast: (msg: string, type: "success" | "error" | "info") => void;
}

export function QuickEntryForm({
  userId,
  transactions,
  amount,
  setAmount,
  category,
  setCategory,
  type,
  setType,
  tagsInput,
  setTagsInput,
  description,
  setDescription,
  onSave,
  toast,
}: QuickEntryFormProps) {
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  const amountSuggestions = useMemo(() => {
    let amtVal = parseFloat(toEnglishDigits(amount).replace(/,/g, ""));
    if (isNaN(amtVal) || amtVal <= 0 || !transactions.length) return [];
    if (amtVal < 1000) amtVal = amtVal * 1000;
    const similar = transactions.filter(
      (tx) => Math.abs(Number(tx.amount) - amtVal) <= amtVal * 0.15,
    );
    const suggestions: Array<{
      category: string;
      tags: string[];
      description: string;
    }> = [];
    const seen = new Set<string>();
    for (const tx of similar) {
      const key = tx.category.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          category: tx.category,
          tags: tx.tags,
          description: tx.description || "",
        });
      }
      if (suggestions.length >= 3) break;
    }
    return suggestions;
  }, [amount, transactions]);

  const sortedFrequentTags = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const freq: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.tags && Array.isArray(tx.tags)) {
        tx.tags.forEach((tag) => {
          const t = tag.trim();
          if (t) freq[t] = (freq[t] || 0) + 1;
        });
      }
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [transactions]);

  const currentTagQuery = useMemo(() => {
    const parts = tagsInput.split(",");
    return parts[parts.length - 1].trim();
  }, [tagsInput]);

  const filteredTags = useMemo(() => {
    if (!currentTagQuery) return sortedFrequentTags;
    return sortedFrequentTags.filter((tag) =>
      tag.toLowerCase().includes(currentTagQuery.toLowerCase()),
    );
  }, [sortedFrequentTags, currentTagQuery]);

  useEffect(() => {
    let amtVal = parseFloat(toEnglishDigits(amount).replace(/,/g, ""));
    if (isNaN(amtVal) || amtVal <= 0 || !category.trim()) {
      setBudgetWarning(null);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      if (type !== "expense") {
        setBudgetWarning(null);
        return;
      }
      const tags = (tagsInput || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (amtVal < 1000) amtVal = amtVal * 1000;
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
            const txParts = getJalaliDateParts(new Date(tx.createdAt));
            const nowParts = getJalaliDateParts(new Date());
            return (
              txParts.month === nowParts.month && txParts.year === nowParts.year
            );
          })
          .reduce((sum, tx) => sum + Number(tx.amount), 0);
        const nextTotal = currentMonthExpenses + amtVal;
        if (nextTotal >= limit * 0.8) {
          setBudgetWarning(
            `هشدار: با ثبت این تراکنش، مخارج شما به ${((nextTotal / limit) * 100).toFixed(0)}٪ از سقف بودجه تعیین شده (${formatPersianNumber(limit)} تومان) برای عنوان یا تگ "${budget.categoryOrTag}" خواهد رسید.`,
          );
        } else {
          setBudgetWarning(null);
        }
      } else {
        setBudgetWarning(null);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [amount, category, tagsInput, type, transactions, userId]);

  const handleSubmit = (e: React.FormEvent) => {
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
      setValidationError(validation.error.issues[0].message);
      return;
    }
    const numAmt = parseFloat(toEnglishDigits(amount).replace(/,/g, ""));
    const finalAmt = numAmt < 1000 ? numAmt * 1000 : numAmt;
    const tags = (tagsInput || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSave(finalAmt, tags);
  };

  const applySuggestion = (sug: {
    category: string;
    tags: string[];
    description: string;
  }) => {
    setCategory(sug.category);
    setTagsInput((sug.tags || []).join(", "));
    setDescription(sug.description);
    toast(
      `عنوان و تگ بر اساس مبلغ به عنوان "${sug.category}" اعمال شد`,
      "info",
    );
  };

  const handleSelectTag = (tag: string) => {
    const parts = tagsInput.split(",");
    parts[parts.length - 1] = tag;
    const joined = parts
      .map((p) => p.trim())
      .filter(Boolean)
      .join(", ");
    setTagsInput(joined ? joined + ", " : tag + ", ");
    setShowTagsDropdown(false);
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
    <form
      onSubmit={handleSubmit}
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
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-medium leading-relaxed font-vazir flex items-start gap-1.5">
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
            dir="ltr"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
          />
          {amountSuggestions.length > 0 && (
            <div className="pt-2 animate-in fade-in duration-200">
              <span className="text-[10px] font-semibold text-muted-foreground block mb-1 font-vazir">
                حدس عنوان بر اساس مبلغ وارد شده:
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
              className={`rounded-lg border text-xs font-semibold transition-all cursor-pointer font-vazir ${type === "expense" ? "border-red-500/30 bg-red-500/5 text-red-600" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
            >
              هزینه
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`rounded-lg border text-xs font-semibold transition-all cursor-pointer font-vazir ${type === "income" ? "border-green-500/30 bg-green-500/5 text-green-600" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
            >
              درآمد
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
            عنوان خرج / درآمد
          </label>
          <input
            type="text"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="مثال: خرید شیر، تاکسی، حقوق"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
          />
        </div>
        <div className="relative space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
            برچسب‌ها (با کاما جدا کنید)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onFocus={() => setShowTagsDropdown(true)}
            onBlur={() => setTimeout(() => setShowTagsDropdown(false), 220)}
            placeholder="مثال: خونه، غذا، رفت و آمد"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
          />
          {showTagsDropdown && filteredTags.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-lg">
              {filteredTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={() => handleSelectTag(tag)}
                  className="w-full text-right px-3 py-2.5 text-xs hover:bg-muted text-foreground transition-colors cursor-pointer font-vazir"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
          توضیحات اختیاری
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
  );
}
