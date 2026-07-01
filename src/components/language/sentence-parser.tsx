"use client";

import React, { useState, useMemo, useEffect } from "react";
import { localDb } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";

const cardFormSchema = z.object({
  text: z.string().min(1, "متن انگلیسی وارد شده خالی است"),
  translation: z.string().min(1, "ترجمه فارسی الزامی است"),
  selectedWord: z
    .string()
    .min(1, "تعیین یک کلمه به عنوان کلمه اصلی اجباری است"),
});

export function SentenceParser({
  onSaveSuccess,
}: {
  onSaveSuccess: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [selectedWord, setSelectedWord] = useState("");
  const [isSentenceTranslation, setIsSentenceTranslation] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const words = useMemo(() => {
    if (!text.trim()) return [];
    return text.split(/[\s,./#!$%\^&*;:{}=\-_`~()?]+/).filter(Boolean);
  }, [text]);

  const wordsSerialized = words.join(" ");

  useEffect(() => {
    const wordsArray = wordsSerialized.split(" ").filter(Boolean);
    if (wordsArray.length > 0) {
      if (!selectedWord || !wordsArray.includes(selectedWord)) {
        setSelectedWord(wordsArray[0]);
      }
    } else {
      setSelectedWord("");
    }
  }, [wordsSerialized]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const validation = cardFormSchema.safeParse({
      text,
      translation,
      selectedWord,
    });

    if (!validation.success) {
      setValidationError(validation.error.errors[0].message);
      return;
    }

    const userId = user?.id || "guest";
    await localDb.languageCards.put({
      id: uuidv4(),
      userId,
      originalText: text.trim(),
      translation: translation.trim(),
      focusWord: selectedWord,
      isSentenceTranslation,
      srsStatus: "hard",
      nextReviewAt: new Date(),
      intervalDays: 0,
      easeFactor: 2.5,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    });

    setText("");
    setTranslation("");
    setIsSentenceTranslation(true);
    toast("کارت جدید لایتنر با موفقیت اضافه شد", "success");
    onSaveSuccess();
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {validationError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium leading-relaxed font-vazir flex items-start gap-1.5">
          <AlertTriangle className="size-4 shrink-0 text-red-500 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-vazir">
            کلمه یا جمله انگلیسی
          </label>
          {selectedWord && (
            <span className="text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full font-bold font-vazir">
              کلمه اصلی: {selectedWord}
            </span>
          )}
        </div>
        <textarea
          required
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all resize-none ltr"
          placeholder="Type or paste the English sentence here..."
        />
      </div>

      {words.length > 0 && (
        <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase font-vazir">
              انتخاب کلمه کلیدی اصلی
            </span>
            {selectedWord && (
              <span className="text-xs text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full font-medium">
                کلمه اصلی: {selectedWord}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 ltr">
            {words.map((word, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedWord(word)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-all cursor-pointer ${
                  selectedWord === word
                    ? "border-red-500/40 bg-red-500/5 text-red-600 font-semibold shadow-md shadow-red-500/10 ring-2 ring-red-500/20"
                    : "border-border bg-background hover:bg-muted text-foreground"
                }`}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-vazir">
          ترجمه فارسی
        </label>
        <input
          type="text"
          required
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
          placeholder="ترجمه فارسی را وارد کنید..."
        />
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={isSentenceTranslation}
            onChange={() => setIsSentenceTranslation(true)}
            className="h-4 w-4 text-primary border-border focus:ring-primary"
          />
          <span className="text-xs text-foreground font-medium font-vazir">
            ترجمه مربوط به کل جمله است
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!isSentenceTranslation}
            onChange={() => setIsSentenceTranslation(false)}
            className="h-4 w-4 text-primary border-border focus:ring-primary"
          />
          <span className="text-xs text-foreground font-medium font-vazir">
            ترجمه فقط مربوط به کلمه اصلی است
          </span>
        </label>
      </div>

      <Button type="submit" className="w-full font-vazir">
        ذخیره و ایجاد کارت
      </Button>
    </form>
  );
}
