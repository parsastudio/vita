"use client";

import React, { useState, useMemo } from "react";
import { type FinanceTransaction } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useFinanceActions } from "@/hooks/use-finance-actions";
import { NlpAssistant } from "@/components/finance/nlp-assistant";
import { QuickEntryForm } from "@/components/finance/quick-entry-form";
import { formatPersianNumber } from "@/lib/utils";

interface ParsedNlp {
  amount: number;
  type: "income" | "expense";
  category: string;
  tags: string[];
  description: string;
}

interface PresetQuick {
  label: string;
  amount: number;
  type: "income" | "expense";
  category: string;
}

const BASE_PRESETS: PresetQuick[] = [
  { label: "قهوه", amount: 50000, type: "expense", category: "خوراک" },
  { label: "تاکسی", amount: 40000, type: "expense", category: "رفت و آمد" },
  { label: "حقوق", amount: 25000000, type: "income", category: "حقوق" },
  { label: "سوپرمارکت", amount: 150000, type: "expense", category: "خوراک" },
];

function formatPresetLabel(preset: { label: string; amount: number }): string {
  return `${preset.label} - ${formatPersianNumber(preset.amount)} تومان`;
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

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [description, setDescription] = useState("");

  const userId = user?.id || "guest";
  const {
    saveManualTransaction,
    saveDirectTransaction,
    savePresetTransaction,
  } = useFinanceActions(userId);

  const dynamicQuickActions = useMemo<PresetQuick[]>(() => {
    if (!transactions || transactions.length === 0) {
      return BASE_PRESETS.map((p) => ({
        ...p,
        label: formatPresetLabel(p),
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
        label: formatPresetLabel({
          label: displayLabel,
          amount: item.tx.amount,
        }),
        amount: item.tx.amount,
        type: item.tx.type,
        category: item.tx.category,
      };
    });

    if (result.length < 4) {
      const remaining = BASE_PRESETS.slice(0, 4 - result.length).map((p) => ({
        ...p,
        label: formatPresetLabel(p),
      }));
      return [...result, ...remaining];
    }

    return result;
  }, [transactions]);

  const handleApplyParsed = (parsed: ParsedNlp) => {
    setAmount(parsed.amount.toLocaleString("en-US"));
    setType(parsed.type);
    setCategory(parsed.category);
    setTagsInput(parsed.tags.join(", "));
    setDescription(parsed.description);
    toast("اطلاعات پردازش شده با موفقیت در فرم بارگذاری شد", "info");
  };

  const handleDirectSave = async (parsed: ParsedNlp) => {
    await saveDirectTransaction(parsed);
    toast("تراکنش به کمک دستیار هوشمند با موفقیت ثبت شد", "success");
    onSaveSuccess();
  };

  const handlePresetSelect = async (preset: PresetQuick) => {
    await savePresetTransaction(preset);
    toast(
      `تراکنش ثبت سریع "${preset.label.split(" - ")[0]}" انجام شد`,
      "success",
    );
    onSaveSuccess();
  };

  const handleManualSave = async (amountNum: number, tags: string[]) => {
    await saveManualTransaction(amountNum, type, category, tags, description);

    setAmount("");
    setCategory("");
    setTagsInput("");
    setDescription("");
    toast("تراکنش با موفقیت ثبت شد", "success");
    onSaveSuccess();
  };

  return (
    <div className="space-y-8">
      <NlpAssistant
        onApplyParsed={handleApplyParsed}
        onDirectSave={handleDirectSave}
        onPresetSelect={handlePresetSelect}
        dynamicQuickActions={dynamicQuickActions}
      />

      <QuickEntryForm
        userId={userId}
        transactions={transactions}
        amount={amount}
        setAmount={setAmount}
        category={category}
        setCategory={setCategory}
        type={type}
        setType={setType}
        tagsInput={tagsInput}
        setTagsInput={setTagsInput}
        description={description}
        setDescription={setDescription}
        onSave={handleManualSave}
        toast={toast}
      />
    </div>
  );
}
