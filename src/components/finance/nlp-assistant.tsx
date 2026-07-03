"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { parseNaturalLanguageTransaction } from "@/lib/nlp";
import { formatPersianNumber } from "@/lib/utils";
import { Sparkles, ArrowDown, ArrowUp } from "lucide-react";

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

interface NlpAssistantProps {
  onApplyParsed: (parsed: ParsedNlp) => void;
  onDirectSave: (parsed: ParsedNlp) => Promise<void>;
  onPresetSelect: (preset: PresetQuick) => Promise<void>;
  dynamicQuickActions: PresetQuick[];
}

export function NlpAssistant({
  onApplyParsed,
  onDirectSave,
  onPresetSelect,
  dynamicQuickActions,
}: NlpAssistantProps) {
  const [nlpText, setNlpText] = useState("");

  const parsedNlp = useMemo(() => {
    return parseNaturalLanguageTransaction(nlpText);
  }, [nlpText]);

  const handleApply = () => {
    if (parsedNlp && parsedNlp.amount > 0) {
      onApplyParsed(parsedNlp);
      setNlpText("");
    }
  };

  const handleSaveDirect = async () => {
    if (parsedNlp && parsedNlp.amount > 0) {
      await onDirectSave(parsedNlp);
      setNlpText("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4 sm:p-5 bg-gradient-to-r from-primary/5 via-violet-500/5 to-indigo-500/5 rounded-2xl border border-primary/10 backdrop-blur-md transition-all duration-300 hover:border-primary/20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider font-vazir flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary animate-pulse" />
            دستیار صوتی و متنی هوشمند ویتا
          </label>
          <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium font-vazir">
            پردازشگر طبیعی کلمات
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={nlpText}
            onChange={(e) => setNlpText(e.target.value)}
            placeholder="مثلاً: ۵۰ هزار تاکسی یا ۴.۵ میلیون حقوق..."
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir min-w-0"
          />
          {parsedNlp && parsedNlp.amount > 0 && (
            <div className="flex gap-1.5 shrink-0 justify-stretch">
              <Button
                type="button"
                onClick={handleApply}
                variant="outline"
                className="flex-1 sm:flex-initial text-xs h-10"
              >
                اعمال روی فرم
              </Button>
              <Button
                type="button"
                onClick={handleSaveDirect}
                className="flex-1 sm:flex-initial text-xs h-10"
              >
                ثبت مستقیم
              </Button>
            </div>
          )}
        </div>

        {parsedNlp && parsedNlp.amount > 0 && (
          <div className="p-4 bg-card/60 backdrop-blur-sm rounded-xl border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="font-vazir">
              <span className="font-medium text-muted-foreground">
                تشخیص سیستم:
              </span>{" "}
              <span
                className={`font-bold ${
                  parsedNlp.type === "income"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {parsedNlp.type === "income" ? "+" : "-"}
                {formatPersianNumber(parsedNlp.amount)} تومان
              </span>{" "}
              ، عنوان:{" "}
              <span className="font-semibold text-foreground">
                {parsedNlp.category}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold font-vazir self-start sm:self-auto">
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
              onClick={() => onPresetSelect(preset)}
              className="px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted text-xs text-foreground font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer font-vazir max-w-full truncate"
            >
              <span className="font-bold">
                {preset.type === "income" ? (
                  <ArrowDown className="size-3 text-green-600 inline-block" />
                ) : (
                  <ArrowUp className="size-3 text-red-600 inline-block" />
                )}
              </span>
              <span className="truncate">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
