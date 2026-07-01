"use client";

import React, { useState, useMemo, useEffect } from "react";
import { localDb, type LanguageCard } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Volume2, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { formatPersianNumber } from "@/lib/utils";

export function WordList({ cards }: { cards: LanguageCard[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "hardest" | "easiest">(
    "newest",
  );
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sortedAndFiltered = useMemo(() => {
    const matched = cards.filter((card) => {
      const matchesSearch =
        card.originalText.toLowerCase().includes(search.toLowerCase()) ||
        card.translation.toLowerCase().includes(search.toLowerCase()) ||
        card.focusWord.toLowerCase().includes(search.toLowerCase());

      if (filterStatus === "all") return matchesSearch;
      return matchesSearch && card.srsStatus === filterStatus;
    });

    const activeCards = matched.filter((c) => c.srsStatus === "active");
    const archivedCards = matched.filter((c) => c.srsStatus === "archived");

    const sortFn = (a: LanguageCard, b: LanguageCard) => {
      if (sortBy === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sortBy === "hardest") {
        return b.difficulty - a.difficulty;
      }
      return a.difficulty - b.difficulty;
    };

    const sortedActive = [...activeCards].sort(sortFn);
    const sortedArchived = [...archivedCards].sort(sortFn);

    return [...sortedActive, ...sortedArchived];
  }, [cards, search, filterStatus, sortBy]);

  const handleSpeak = (text: string) => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        let voices = window.speechSynthesis.getVoices();

        const triggerSpeech = () => {
          const enVoice = voices.find((v) => v.lang.startsWith("en"));
          if (enVoice) {
            utterance.voice = enVoice;
          }
          window.speechSynthesis.speak(utterance);
        };

        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            triggerSpeech();
          };
        } else {
          triggerSpeech();
        }
      } else {
        toast("مرورگر شما از قابلیت تلفظ صوتی پشتیبانی نمی‌کند", "error");
      }
    } catch {
      toast("خطایی در تلفظ صوتی رخ داده است", "error");
    }
  };

  const handleToggleArchive = async (card: LanguageCard) => {
    const isArchiving = card.srsStatus === "active";
    const nextStatus = isArchiving ? "archived" : "active";
    const nextDifficulty = isArchiving ? 0.05 : card.difficulty;

    await localDb.transaction("rw", [localDb.languageCards], async () => {
      await localDb.languageCards.update(card.id, {
        srsStatus: nextStatus,
        difficulty: nextDifficulty,
        updatedAt: new Date(),
        synced: false,
      });
    });

    toast(
      isArchiving
        ? "کارت با موفقیت آرشیو شد و سختی آن به حداقل کاهش یافت"
        : "کارت مجدداً به چرخه یادگیری فعال بازگشت",
      "success",
    );
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
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در متن انگلیسی یا ترجمه فارسی..."
          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-1.5 bg-muted/40 rounded-xl border border-border">
          <div className="flex flex-wrap gap-1">
            {[
              { key: "all", label: "همه کلمات" },
              { key: "active", label: "در جریان مرور" },
              { key: "archived", label: "آرشیو شده‌ها" },
            ].map((status) => (
              <Button
                key={status.key}
                variant={filterStatus === status.key ? "default" : "ghost"}
                size="xs"
                onClick={() => setFilterStatus(status.key)}
                className="font-vazir text-xs h-7 rounded-lg"
              >
                {status.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-[10px] text-muted-foreground font-vazir">
              ترتیب بر اساس:
            </span>
            <div className="flex gap-1 bg-background border border-border rounded-lg p-0.5">
              {[
                { key: "newest", label: "جدیدترین" },
                { key: "hardest", label: "سخت‌ترین" },
                { key: "easiest", label: "آسان‌ترین" },
              ].map((sort) => (
                <button
                  key={sort.key}
                  onClick={() => setSortBy(sort.key as typeof sortBy)}
                  className={`px-2.5 py-1 text-[10px] font-bold font-vazir rounded-md transition-all cursor-pointer ${
                    sortBy === sort.key
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pe-1">
        {sortedAndFiltered.map((card) => (
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
                    card.srsStatus === "active"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {card.srsStatus === "active" ? "در جریان" : "آرشیو"}
                </span>

                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-vazir">
                  سختی:{" "}
                  {mounted
                    ? formatPersianNumber((card.difficulty * 100).toFixed(0))
                    : (card.difficulty * 100).toFixed(0)}
                  ٪
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
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleSpeak(card.focusWord)}
                aria-label="تلفظ انگلیسی"
                className="rounded-full hover:scale-105 transition-transform"
              >
                <Volume2 className="size-3.5 text-foreground" />
              </Button>

              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleToggleArchive(card)}
                aria-label={
                  card.srsStatus === "active"
                    ? "بایگانی کلمه"
                    : "خروج از بایگانی"
                }
                className="rounded-full hover:scale-105 transition-transform text-muted-foreground hover:text-foreground"
              >
                {card.srsStatus === "active" ? (
                  <Archive className="size-3.5" />
                ) : (
                  <ArchiveRestore className="size-3.5" />
                )}
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

        {sortedAndFiltered.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground font-vazir">
            هیچ کارتی یافت نشد.
          </div>
        )}
      </div>
    </div>
  );
}
