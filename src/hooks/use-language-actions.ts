"use client";

import { localDb, type LanguageCard } from "@/lib/db/client";
import { Rating, fsrs, type Grade } from "ts-fsrs";
import { mapToFSRSCard, mapFromFSRSCard, createNewFSRSCard } from "@/lib/fsrs";
import { useAuth } from "@/lib/auth/auth-context";
import { v4 as uuidv4 } from "uuid";

export function useLanguageActions() {
  const scheduler = fsrs();
  const { user } = useAuth();
  const userId = user?.id || "guest";

  const handleSrsAction = async (
    card: LanguageCard,
    ratingVal: Rating | "archived",
  ) => {
    if (ratingVal === "archived") {
      await localDb.languageCards.update(card.id, {
        srsStatus: "archived",
        difficulty: 1.0,
        updatedAt: new Date(),
        synced: false,
      });
      return { status: "archived" };
    }

    const now = new Date();
    const cardRepresentation = mapToFSRSCard(card);
    const result = scheduler.next(cardRepresentation, now, ratingVal as Grade);
    const updatedFields = mapFromFSRSCard(result.card);

    await localDb.languageCards.update(card.id, {
      ...updatedFields,
      updatedAt: new Date(),
      synced: false,
    });

    return { status: "updated", updatedFields };
  };

  const toggleArchiveCard = async (card: LanguageCard) => {
    const isArchiving = card.srsStatus === "active";
    const nextStatus = isArchiving ? "archived" : "active";
    const nextDifficulty = isArchiving ? 1.0 : card.difficulty;

    await localDb.transaction("rw", [localDb.languageCards], async () => {
      await localDb.languageCards.update(card.id, {
        srsStatus: nextStatus,
        difficulty: nextDifficulty,
        updatedAt: new Date(),
        synced: false,
      });
    });

    return isArchiving;
  };

  const deleteCard = async (id: string) => {
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

  const addCard = async (
    text: string,
    translation: string,
    selectedWord: string,
  ) => {
    const fsrsDefaults = createNewFSRSCard();

    await localDb.transaction("rw", [localDb.languageCards], async () => {
      const newCard: LanguageCard = {
        id: uuidv4(),
        userId,
        originalText: text.trim(),
        translation: translation.trim(),
        focusWord: selectedWord,
        srsStatus: "active",
        due: fsrsDefaults.due,
        stability: fsrsDefaults.stability,
        difficulty: fsrsDefaults.difficulty,
        elapsedDays: fsrsDefaults.elapsedDays,
        scheduledDays: fsrsDefaults.scheduledDays,
        reps: fsrsDefaults.reps,
        lapses: fsrsDefaults.lapses,
        state: fsrsDefaults.state,
        lastReview: fsrsDefaults.lastReview,
        learningSteps: fsrsDefaults.learningSteps,
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };
      await localDb.languageCards.put(newCard);
    });
  };

  const importCards = async (
    items: Array<{
      originalText: string;
      translation: string;
      focusWord: string;
      srsStatus?: "active" | "archived" | "queued";
    }>,
  ) => {
    const fsrsDefaults = createNewFSRSCard();
    const todayStr = new Date().toISOString().split("T")[0];
    const localStorageKey = `vita_last_auto_activation_${userId}`;
    const lastActivationDate =
      typeof window !== "undefined"
        ? localStorage.getItem(localStorageKey)
        : null;

    const shouldAutoActivateToday = lastActivationDate !== todayStr;
    let activatedTodayCount = 0;

    await localDb.transaction("rw", [localDb.languageCards], async () => {
      for (const item of items) {
        const normalizedText = item.originalText.trim();
        const existing = await localDb.languageCards
          .where("userId")
          .equals(userId)
          .filter(
            (c) =>
              c.originalText.trim().toLowerCase() ===
              normalizedText.toLowerCase(),
          )
          .first();

        if (existing) continue;

        let status = item.srsStatus || "queued";

        if (
          status === "queued" &&
          shouldAutoActivateToday &&
          activatedTodayCount < 15
        ) {
          status = "active";
          activatedTodayCount++;
        }

        const isArchived = status === "archived";

        const newCard: LanguageCard = {
          id: uuidv4(),
          userId,
          originalText: normalizedText,
          translation: item.translation.trim(),
          focusWord: item.focusWord.trim(),
          srsStatus: status,
          due: status === "active" ? new Date() : fsrsDefaults.due,
          stability: fsrsDefaults.stability,
          difficulty: isArchived ? 1.0 : fsrsDefaults.difficulty,
          elapsedDays: fsrsDefaults.elapsedDays,
          scheduledDays: fsrsDefaults.scheduledDays,
          reps: fsrsDefaults.reps,
          lapses: fsrsDefaults.lapses,
          state: fsrsDefaults.state,
          lastReview: fsrsDefaults.lastReview,
          learningSteps: fsrsDefaults.learningSteps,
          createdAt: new Date(),
          updatedAt: new Date(),
          synced: false,
        };
        await localDb.languageCards.put(newCard);
      }
    });

    if (activatedTodayCount > 0 && typeof window !== "undefined") {
      localStorage.setItem(localStorageKey, todayStr);
    }
  };

  return {
    handleSrsAction,
    toggleArchiveCard,
    deleteCard,
    addCard,
    importCards,
  };
}
