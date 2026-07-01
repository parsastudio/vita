"use client";

import React, { useState, useEffect } from "react";
import { localDb, type LanguageCard } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPersianNumber } from "@/lib/utils";
import { Volume2, Trash2 } from "lucide-react";

export function WordList({ cards }: { cards: LanguageCard[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = cards.filter((card) => {
    const matchesSearch =
      card.originalText.toLowerCase().includes(search.toLowerCase()) ||
      card.translation.toLowerCase().includes(search.toLowerCase()) ||
      card.focusWord.toLowerCase().includes(search.toLowerCase());

    if (filterStatus === "all") return matchesSearch;
    return matchesSearch && card.srsStatus === filterStatus;
  });

  const handleSpeak = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDelete = async (id: string) => {
    await localDb.transaction(
      "rw",
      [localDb.languageCards, localDb.deletedRecords],
      async () => {
        await localDb.languageCards.delete(id);
        await localDb.deletedRecords.put({
          id,
          tableName: "languageCards",
          deletedAt: new Date(),
          synced: false,
        });
      },
    );
    toast("کارت لایتنر با موفقیت حذف شد", "info");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در متن انگلیسی یا ترجمه فارسی..."
          className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
        />

        <div className="flex flex-wrap gap-1.5">
          {[
            { key: "all", label: "همه" },
            { key: "hard", label: "سخت" },
            { key: "medium", label: "متوسط" },
            { key: "easy", label: "آسان" },
            { key: "archived", label: "آرشیو" },
          ].map((status) => (
            <Button
              key={status.key}
              variant={filterStatus === status.key ? "default" : "outline"}
              size="xs"
              onClick={() => setFilterStatus(status.key)}
              className="font-vazir text-xs"
            >
              {status.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pe-1">
        {filtered.map((card) => (
          <div
            key={card.id}
            className="p-4 border border-border bg-background rounded-xl flex items-center justify-between gap-4 group hover:border-muted-foreground/30 transition-all animate-in fade-in duration-300"
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground break-words ltr">
                  {card.originalText}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full font-vazir ${
                    card.srsStatus === "hard"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : card.srsStatus === "medium"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : card.srsStatus === "easy"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {card.srsStatus === "hard" && "سخت"}
                  {card.srsStatus === "medium" && "متوسط"}
                  {card.srsStatus === "easy" && "آسان"}
                  {card.srsStatus === "archived" && "آرشیو"}
                </span>
              </div>
              <p className="text-xs text-primary font-vazir break-words">
                {card.translation}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] text-muted-foreground font-vazir">
                  کلمه تمرکزی اصلی:{" "}
                  <span className="text-destructive font-medium">
                    {card.focusWord}
                  </span>
                </p>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                    card.isSentenceTranslation
                      ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {card.isSentenceTranslation ? "ترجمه جمله" : "ترجمه کلمه"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleSpeak(card.originalText)}
                aria-label="تلفظ انگلیسی"
                className="rounded-full hover:scale-105 transition-transform"
              >
                <Volume2 className="size-3.5 text-foreground" />
              </Button>
              <Button
                variant="destructive"
                size="icon-xs"
                onClick={() => handleDelete(card.id)}
                aria-label="حذف کارت"
                className="rounded-full hover:scale-105 transition-transform"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground font-vazir">
            هیچ کارتی یافت نشد.
          </div>
        )}
      </div>
    </div>
  );
}
