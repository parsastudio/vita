"use client";

import { localDb, type LanguageCard } from "@/lib/db/client";
import { Rating, fsrs, type Grade } from "ts-fsrs";
import { mapToFSRSCard, mapFromFSRSCard } from "@/lib/fsrs";

export function useLanguageActions() {
  const scheduler = fsrs();

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

  return {
    handleSrsAction,
    toggleArchiveCard,
    deleteCard,
  };
}
