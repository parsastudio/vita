"use client";

import React, { useState, useMemo } from "react";
import { localDb, type FinanceTransaction } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";

interface PresetQuick {
  label: string;
  amount: number;
  type: "income" | "expense";
  category: string;
}

const PRESET_QUICKS: PresetQuick[] = [
  { label: "Coffee", amount: 5, type: "expense", category: "Food" },
  { label: "Taxi", amount: 12, type: "expense", category: "Transport" },
  { label: "Salary", amount: 2500, type: "income", category: "Salary" },
  { label: "Groceries", amount: 45, type: "expense", category: "Food" },
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
          ].includes(lower)
        ) {
          parsedType = "income";
        } else {
          detectedTags.push(word);
        }
      }
    }

    const parsedCategory = detectedTags[0] || "General";
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
    const freqMap: Record<string, { count: number; tx: FinanceTransaction }> =
      {};
    transactions.forEach((tx) => {
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

  const checkBudgetThreshold = async (
    cat: string,
    amt: number,
    txType: string,
  ) => {
    if (txType !== "expense") {
      setBudgetWarning(null);
      return;
    }
    const userId = user?.id || "guest";
    const budget = await localDb.financeBudgets
      .where("userId")
      .equals(userId)
      .filter((b) => b.categoryOrTag.toLowerCase() === cat.toLowerCase())
      .first();

    if (budget) {
      const limit = Number(budget.limitAmount);
      const currentMonthExpenses = transactions
        .filter((tx) => {
          if (tx.type !== "expense") return false;
          if (tx.category.toLowerCase() !== cat.toLowerCase()) return false;
          const txDate = new Date(tx.createdAt);
          const now = new Date();
          return (
            txDate.getMonth() === now.getMonth() &&
            txDate.getFullYear() === now.getFullYear()
          );
        })
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const nextTotal = currentMonthExpenses + amt;
      if (nextTotal >= limit * 0.8) {
        setBudgetWarning(
          `Warning: spending will reach ${((nextTotal / limit) * 100).toFixed(0)}% of your monthly budget (${limit}) for "${cat}"`,
        );
      } else {
        setBudgetWarning(null);
      }
    } else {
      setBudgetWarning(null);
    }
  };

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
      description: `Quick entry for ${preset.label}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    });

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
    onSaveSuccess();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 p-5 bg-gradient-to-r from-primary/5 via-violet-500/5 to-indigo-500/5 rounded-2xl border border-primary/10 backdrop-blur-md transition-all duration-300 hover:border-primary/20">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider">
            Natural Language Quick Box
          </label>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            AI Assistant Parser
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nlpText}
            onChange={(e) => setNlpText(e.target.value)}
            placeholder="Type e.g. '50 Taxi work' or '1200 Salary deposit'..."
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
          />
          {parsedNlp && parsedNlp.amount > 0 && (
            <Button type="button" onClick={handleNlpApply}>
              Quick Add
            </Button>
          )}
        </div>

        {parsedNlp && parsedNlp.amount > 0 && (
          <div className="p-4 bg-card/60 backdrop-blur-sm rounded-xl border border-primary/20 flex items-center justify-between text-xs transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <span className="font-medium text-muted-foreground">
                Detected:
              </span>{" "}
              <span
                className={`font-bold ${parsedNlp.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
              >
                {parsedNlp.type === "income" ? "+" : "-"}${parsedNlp.amount}
              </span>{" "}
              in{" "}
              <span className="font-semibold text-foreground">
                {parsedNlp.category}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              Ready to commit
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
          Frequent Transactions (1-Click Add)
        </span>
        <div className="flex flex-wrap gap-2">
          {dynamicQuickActions.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className="px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted text-xs text-foreground font-medium transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span
                className={
                  preset.type === "income" ? "text-green-600" : "text-red-600"
                }
              >
                {preset.type === "income" ? "↓" : "↑"}
              </span>
              <span>{preset.label}</span>
              <span className="text-muted-foreground font-bold">
                ${preset.amount}
              </span>
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleManualSubmit}
        className="space-y-5 pt-4 border-t border-border"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
          Detailed Transaction Form
        </span>

        {budgetWarning && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-medium animate-pulse">
            ⚠️ {budgetWarning}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Amount
            </label>
            <input
              type="text"
              required
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                const val = parseFloat(toEnglishDigits(e.target.value));
                if (!isNaN(val) && val > 0 && category) {
                  checkBudgetThreshold(category, val, type);
                }
              }}
              placeholder="0.00"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2 h-10">
              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  const val = parseFloat(toEnglishDigits(amount));
                  if (!isNaN(val) && val > 0 && category) {
                    checkBudgetThreshold(category, val, "expense");
                  }
                }}
                className={`rounded-lg border text-xs font-semibold transition-all ${
                  type === "expense"
                    ? "border-red-500/30 bg-red-500/5 text-red-600"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("income");
                  setBudgetWarning(null);
                }}
                className={`rounded-lg border text-xs font-semibold transition-all ${
                  type === "income"
                    ? "border-green-500/30 bg-green-500/5 text-green-600"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Income
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Category
            </label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                const val = parseFloat(toEnglishDigits(amount));
                if (!isNaN(val) && val > 0 && e.target.value) {
                  checkBudgetThreshold(e.target.value, val, type);
                }
              }}
              placeholder="e.g. Food, Bills, Rent"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. dinner, restaurant"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details..."
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
          />
        </div>

        <Button type="submit" className="w-full">
          Save Transaction
        </Button>
      </form>
    </div>
  );
}
