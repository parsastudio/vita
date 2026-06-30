"use client";

import React, { useState, useMemo } from "react";
import { localDb } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";

export function SentenceParser({
  onSaveSuccess,
}: {
  onSaveSuccess: () => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [selectedWord, setSelectedWord] = useState("");
  const [isSentenceTranslation, setIsSentenceTranslation] = useState(true);

  const words = useMemo(() => {
    if (!text.trim()) return [];
    return text.split(/[\s,./#!$%\^&*;:{}=\-_`~()?]+/).filter(Boolean);
  }, [text]);

  React.useEffect(() => {
    if (words.length > 0) {
      setSelectedWord(words[0]);
    } else {
      setSelectedWord("");
    }
  }, [words]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !translation.trim()) return;

    const userId = user?.id || "guest";
    await localDb.languageCards.put({
      id: crypto.randomUUID(),
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
    onSaveSuccess();
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Word or Sentence
        </label>
        <textarea
          required
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all resize-none"
          placeholder="Type or paste the English sentence here..."
        />
      </div>

      {words.length > 0 && (
        <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Select Focus Word
            </span>
            {selectedWord && (
              <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-medium">
                Focus: {selectedWord}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {words.map((word, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedWord(word)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                  selectedWord === word
                    ? "border-destructive/40 bg-destructive/5 text-destructive font-semibold shadow-sm"
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
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Translation
        </label>
        <input
          type="text"
          required
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
          placeholder="Enter Persian translation..."
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
          <span className="text-xs text-foreground font-medium">
            Translate full sentence
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!isSentenceTranslation}
            onChange={() => setIsSentenceTranslation(false)}
            className="h-4 w-4 text-primary border-border focus:ring-primary"
          />
          <span className="text-xs text-foreground font-medium">
            Translate focus word only
          </span>
        </label>
      </div>

      <Button type="submit" className="w-full">
        Save Card
      </Button>
    </form>
  );
}
