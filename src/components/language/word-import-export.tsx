"use client";

import React, { useRef } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguageActions } from "@/hooks/use-language-actions";
import { type LanguageCard } from "@/lib/db/client";
import { Upload, Download } from "lucide-react";

const importItemSchema = z.object({
  focusWord: z.string().min(1),
  originalText: z.string().min(1),
  translation: z.string().min(1),
  srsStatus: z.enum(["active", "archived"]).optional(),
});

const importSchema = z.array(importItemSchema);

interface WordImportExportProps {
  cards: LanguageCard[];
}

export function WordImportExport({ cards }: WordImportExportProps) {
  const { toast } = useToast();
  const { importCards } = useLanguageActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (cards.length === 0) {
      toast("هیچ کارتی برای خروجی گرفتن وجود ندارد", "error");
      return;
    }

    const exportData = cards.map((card) => ({
      focusWord: card.focusWord,
      originalText: card.originalText,
      translation: card.translation,
      srsStatus: card.srsStatus,
    }));

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vita_words_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("فایل خروجی با موفقیت بارگیری شد", "success");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string;
        const parsedData = JSON.parse(jsonText);
        const validation = importSchema.safeParse(parsedData);

        if (!validation.success) {
          toast(
            "فرمت فایل معتبر نیست. لطفاً ساختار استاندارد را بررسی کنید",
            "error",
          );
          return;
        }

        await importCards(validation.data);
        toast(
          "کلمات با موفقیت وارد شدند و به چرخه لایتنر افزوده شدند",
          "success",
        );
      } catch {
        toast("خطا در پردازش فایل وارد شده", "error");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />
      <Button
        variant="outline"
        size="xs"
        onClick={handleImportClick}
        className="font-vazir text-xs flex items-center gap-1.5"
      >
        <Upload className="size-3.5" />
        وارد کردن (JSON)
      </Button>
      <Button
        variant="outline"
        size="xs"
        onClick={handleExport}
        className="font-vazir text-xs flex items-center gap-1.5"
      >
        <Download className="size-3.5" />
        خروجی گرفتن (JSON)
      </Button>
    </div>
  );
}
