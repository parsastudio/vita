"use client";

import React, { useState, useEffect, useMemo } from "react";
import { type FinanceTransaction } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { useFinanceActions } from "@/hooks/use-finance-actions";
import { toEnglishDigits } from "@/lib/nlp";
import { AlertTriangle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";

const formSchema = z.object({
  amount: z.string().min(1, "وارد کردن مبلغ الزامی است").refine(
    (val) => {
      const parsed = parseFloat(toEnglishDigits(val).replace(/,/g, ""));
      return !isNaN(parsed) && parsed > 0;
    },
    { message: "مبلغ وارد شده باید عددی بزرگتر از صفر باشد" },
  ),
  category: z.string().min(1, "عنوان تراکنش الزامی است"),
  type: z.enum(["income", "expense"]),
  tagsInput: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

type FormValues = z.infer<typeof formSchema>;

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
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  const { getBudgetWarning } = useFinanceActions(userId);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount,
      category,
      type,
      tagsInput,
      description,
    },
  });

  const formAmount = watch("amount");
  const formCategory = watch("category");
  const formType = watch("type");
  const formTagsInput = watch("tagsInput");
  const formDescription = watch("description");

  useEffect(() => {
    setValue("amount", amount);
  }, [amount, setValue]);

  useEffect(() => {
    setValue("category", category);
  }, [category, setValue]);

  useEffect(() => {
    setValue("type", type);
  }, [type, setValue]);

  useEffect(() => {
    setValue("tagsInput", tagsInput);
  }, [tagsInput, setValue]);

  useEffect(() => {
    setValue("description", description);
  }, [description, setValue]);

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
        tx.tags.forEach((tag: string) => {
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
    const delayDebounce = setTimeout(async () => {
      const warning = await getBudgetWarning(
        formAmount,
        formCategory,
        formTagsInput,
        formType,
        transactions,
      );
      setBudgetWarning(warning);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [formAmount, formCategory, formTagsInput, formType, transactions, getBudgetWarning]);

  const onSubmit = (data: FormValues) => {
    const numAmt = parseFloat(toEnglishDigits(data.amount).replace(/,/g, ""));
    const tags = (data.tagsInput || "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);
    onSave(numAmt, tags);
  };

  const applySuggestion = (sug: {
    category: string;
    tags: string[];
    description: string;
  }) => {
    setCategory(sug.category);
    setValue("category", sug.category);
    const tagsStr = (sug.tags || []).join(", ");
    setTagsInput(tagsStr);
    setValue("tagsInput", tagsStr);
    setDescription(sug.description);
    setValue("description", sug.description);
    toast(
      `عنوان و تگ بر اساس مبلغ به عنوان "${sug.category}" اعمال شد`,
      "info",
    );
  };

  const handleSelectTag = (tag: string) => {
    const parts = (formTagsInput || "").split(",");
    parts[parts.length - 1] = tag;
    const joined = parts
      .map((p: string) => p.trim())
      .filter(Boolean)
      .join(", ");
    const finalVal = joined ? joined + ", " : tag + ", ";
    setTagsInput(finalVal);
    setValue("tagsInput", finalVal);
    setShowTagsDropdown(false);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = toEnglishDigits(e.target.value).replace(/[^0-9]/g, "");
    if (rawVal === "") {
      setAmount("");
      setValue("amount", "");
      return;
    }
    const parsed = parseInt(rawVal, 10);
    if (isNaN(parsed)) return;
    const formatted = parsed.toLocaleString("en-US");
    setAmount(formatted);
    setValue("amount", formatted);
  };

  const validationError =
    errors.amount?.message ||
    errors.category?.message ||
    errors.type?.message;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 pt-4 border-t border-border"
    >
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block font-vazir">
        فرم ثبت تراکنش تفصیلی
      </span>
      <AnimatePresence initial={false}>
        {validationError && (
          <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: "auto", opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium leading-relaxed font-vazir flex items-start gap-1.5 overflow-hidden animate-shake"
          >
            <AlertTriangle className="size-4 shrink-0 text-red-500 mt-0.5" />
            <span>{validationError}</span>
          </motion.div>
        )}
        {budgetWarning && (
          <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: "auto", opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-medium leading-relaxed font-vazir flex items-start gap-1.5 overflow-hidden"
          >
            <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
            <span>{budgetWarning}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 min-w-0">
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
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir min-w-0"
          />
          <AnimatePresence>
            {amountSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="pt-2"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="space-y-1.5 min-w-0">
          <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
            نوع تراکنش
          </label>
          <div className="grid grid-cols-2 gap-2 h-10">
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setValue("type", "expense");
              }}
              className={`rounded-lg border text-xs font-semibold transition-all cursor-pointer font-vazir ${formType === "expense" ? "border-red-500/30 bg-red-500/5 text-red-600 font-bold" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
            >
              هزینه
            </button>
            <button
              type="button"
              onClick={() => {
                setType("income");
                setValue("type", "income");
              }}
              className={`rounded-lg border text-xs font-semibold transition-all cursor-pointer font-vazir ${formType === "income" ? "border-green-500/30 bg-green-500/5 text-green-600 font-bold" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
            >
              درآمد
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 min-w-0">
          <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
            عنوان خرج / درآمد
          </label>
          <input
            type="text"
            value={formCategory}
            onChange={(e) => {
              setCategory(e.target.value);
              setValue("category", e.target.value);
            }}
            placeholder="مثال: خرید شیر، تاکسی، حقوق"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir min-w-0"
          />
        </div>
        <div className="relative space-y-1.5 min-w-0">
          <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
            برچسب‌ها (با کاما جدا کنید)
          </label>
          <input
            type="text"
            value={formTagsInput}
            onChange={(e) => {
              setTagsInput(e.target.value);
              setValue("tagsInput", e.target.value);
            }}
            onFocus={() => setShowTagsDropdown(true)}
            onBlur={() => setTimeout(() => setShowTagsDropdown(false), 220)}
            placeholder="مثال: خونه، غذا، رفت و آمد"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir min-w-0"
          />
          <AnimatePresence>
            {showTagsDropdown && filteredTags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-lg"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="space-y-1.5 min-w-0">
        <label className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
          توضیحات اختیاری
        </label>
        <input
          type="text"
          value={formDescription}
          onChange={(e) => {
            setDescription(e.target.value);
            setValue("description", e.target.value);
          }}
          placeholder="جزئیات بیشتر..."
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir min-w-0"
        />      </div>
      <Button type="submit" className="w-full font-vazir h-10 text-sm">
        ذخیره و ثبت در دفتر مالی
      </Button>
    </form>
  );
}
