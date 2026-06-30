"use client";

import React, { useState } from "react";
import { localDb, type LanguageCard } from "@/lib/db/client";
import { Button } from "@/components/ui/button";

export function WordList({ cards }: { cards: LanguageCard[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search original text or translation..."
          className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
        />

        <div className="flex flex-wrap gap-1.5">
          {["all", "hard", "medium", "easy", "archived"].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="xs"
              onClick={() => setFilterStatus(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {filtered.map((card) => (
          <div
            key={card.id}
            className="p-4 border border-border bg-background rounded-xl flex items-center justify-between gap-4 group hover:border-muted-foreground/30 transition-all"
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground break-words">
                  {card.originalText}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                    card.srsStatus === "hard"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : card.srsStatus === "medium"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : card.srsStatus === "easy"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {card.srsStatus}
                </span>
              </div>
              <p className="text-xs text-primary font-vazir break-words">
                {card.translation}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Focus Word:{" "}
                <span className="text-destructive font-medium">
                  {card.focusWord}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleSpeak(card.originalText)}
              >
                🔊
              </Button>
              <Button
                variant="destructive"
                size="icon-xs"
                onClick={() => handleDelete(card.id)}
              >
                🗑️
              </Button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No matching records found.
          </div>
        )}
      </div>
    </div>
  );
}
