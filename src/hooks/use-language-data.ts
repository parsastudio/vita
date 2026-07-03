"use client";

import { useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb, type LanguageCard } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useLanguageActions } from "./use-language-actions";

export function useLanguageData() {
  const { user } = useAuth();
  const userId = user?.id || "guest";
  const { reconcileLanguageQueue } = useLanguageActions();

  const cards = useLiveQuery(() => {
    return localDb.languageCards.where("userId").equals(userId).toArray();
  }, [userId]);

  useEffect(() => {
    if (userId === "guest") return;

    const checkAndReconcile = async () => {
      const settings = await localDb.userSettings
        .where("userId")
        .equals(userId)
        .first();
      if (!settings) return;

      const todayStr = new Date().toISOString().split("T")[0];
      if (settings.lastNewWordsDate !== todayStr) {
        await reconcileLanguageQueue(userId);
      }
    };

    checkAndReconcile();
  }, [userId, reconcileLanguageQueue]);

  const reviewCards = useMemo<LanguageCard[]>(() => {
    if (!cards || cards.length === 0) return [];
    const activeCards = cards.filter((card) => card.srsStatus === "active");
    if (activeCards.length === 0) return [];

    const now = new Date();
    return activeCards
      .filter((card) => !card.due || new Date(card.due) <= now)
      .sort((a, b) => {
        const dateA = a.due ? new Date(a.due).getTime() : 0;
        const dateB = b.due ? new Date(b.due).getTime() : 0;
        return dateA - dateB;
      });
  }, [cards]);

  const nextReviewDate = useMemo(() => {
    if (!cards || cards.length === 0) return null;
    const activeCards = cards.filter((card) => card.srsStatus === "active");
    const now = new Date();
    const futureCards = activeCards.filter(
      (card) => card.due && new Date(card.due) > now,
    );
    if (futureCards.length === 0) return null;
    const closest = futureCards.reduce((closest, card) => {
      return new Date(card.due) < new Date(closest.due) ? card : closest;
    });
    return new Date(closest.due);
  }, [cards]);

  const cardCount = cards?.length || 0;
  const reviewCount = reviewCards.length;

  return {
    cards: cards || [],
    reviewCards,
    nextReviewDate,
    cardCount,
    reviewCount,
    userId,
  };
}
