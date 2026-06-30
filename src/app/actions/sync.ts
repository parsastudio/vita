"use server";

import { db } from "@/lib/db/server";
import {
  languageCards,
  financeTransactions,
  financeBudgets,
  userSettings,
} from "@/lib/db/schema";
import { eq, and, gt, inArray } from "drizzle-orm";

interface SyncLanguageCard {
  id: string;
  originalText: string;
  translation: string;
  focusWord: string;
  isSentenceTranslation: boolean;
  srsStatus: string;
  nextReviewAt: string | Date;
  intervalDays: number | string;
  easeFactor: number | string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface SyncFinanceTransaction {
  id: string;
  amount: number | string;
  type: string;
  category: string;
  tags: string[];
  description: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface SyncFinanceBudget {
  id: string;
  categoryOrTag: string;
  limitAmount: number | string;
  period: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface SyncUserSettings {
  id: string;
  enabledModules: string[];
  updatedAt: string | Date;
}

interface SyncDeletedRecord {
  id: string;
  tableName: string;
  deletedAt: string | Date;
}

interface SyncPayload {
  userId: string;
  lastSyncedAt: string | null;
  languageCards: SyncLanguageCard[];
  financeTransactions: SyncFinanceTransaction[];
  financeBudgets: SyncFinanceBudget[];
  userSettings: SyncUserSettings[];
  deletedRecords: SyncDeletedRecord[];
}

export async function syncData(payload: SyncPayload) {
  const { userId, lastSyncedAt, ...changes } = payload;
  const lastSyncDate = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);

  if (changes.deletedRecords && changes.deletedRecords.length > 0) {
    const cardIdsToDelete = changes.deletedRecords
      .filter((r) => r.tableName === "languageCards")
      .map((r) => r.id);
    const txIdsToDelete = changes.deletedRecords
      .filter((r) => r.tableName === "financeTransactions")
      .map((r) => r.id);
    const budgetIdsToDelete = changes.deletedRecords
      .filter((r) => r.tableName === "financeBudgets")
      .map((r) => r.id);

    if (cardIdsToDelete.length > 0) {
      await db
        .delete(languageCards)
        .where(
          and(
            eq(languageCards.userId, userId),
            inArray(languageCards.id, cardIdsToDelete),
          ),
        );
    }
    if (txIdsToDelete.length > 0) {
      await db
        .delete(financeTransactions)
        .where(
          and(
            eq(financeTransactions.userId, userId),
            inArray(financeTransactions.id, txIdsToDelete),
          ),
        );
    }
    if (budgetIdsToDelete.length > 0) {
      await db
        .delete(financeBudgets)
        .where(
          and(
            eq(financeBudgets.userId, userId),
            inArray(financeBudgets.id, budgetIdsToDelete),
          ),
        );
    }
  }

  for (const card of changes.languageCards) {
    const existingGlobal = await db.query.languageCards.findFirst({
      where: eq(languageCards.id, card.id),
    });

    if (existingGlobal && existingGlobal.userId !== userId) {
      continue;
    }

    const cardData = {
      id: card.id,
      userId,
      originalText: card.originalText,
      translation: card.translation,
      focusWord: card.focusWord,
      isSentenceTranslation: card.isSentenceTranslation,
      srsStatus: card.srsStatus,
      nextReviewAt: new Date(card.nextReviewAt),
      intervalDays: String(card.intervalDays),
      easeFactor: String(card.easeFactor),
      createdAt: new Date(card.createdAt),
      updatedAt: new Date(card.updatedAt),
    };

    if (!existingGlobal) {
      await db.insert(languageCards).values(cardData);
    } else if (new Date(card.updatedAt) > new Date(existingGlobal.updatedAt)) {
      await db
        .update(languageCards)
        .set(cardData)
        .where(eq(languageCards.id, card.id));
    }
  }

  for (const tx of changes.financeTransactions) {
    const existingGlobal = await db.query.financeTransactions.findFirst({
      where: eq(financeTransactions.id, tx.id),
    });

    if (existingGlobal && existingGlobal.userId !== userId) {
      continue;
    }

    const txData = {
      id: tx.id,
      userId,
      amount: String(tx.amount),
      type: tx.type,
      category: tx.category,
      tags: tx.tags,
      description: tx.description,
      createdAt: new Date(tx.createdAt),
      updatedAt: new Date(tx.updatedAt),
    };

    if (!existingGlobal) {
      await db.insert(financeTransactions).values(txData);
    } else if (new Date(tx.updatedAt) > new Date(existingGlobal.updatedAt)) {
      await db
        .update(financeTransactions)
        .set(txData)
        .where(eq(financeTransactions.id, tx.id));
    }
  }

  for (const budget of changes.financeBudgets) {
    const existingGlobal = await db.query.financeBudgets.findFirst({
      where: eq(financeBudgets.id, budget.id),
    });

    if (existingGlobal && existingGlobal.userId !== userId) {
      continue;
    }

    const budgetData = {
      id: budget.id,
      userId,
      categoryOrTag: budget.categoryOrTag,
      limitAmount: String(budget.limitAmount),
      period: budget.period,
      createdAt: new Date(budget.createdAt),
      updatedAt: new Date(budget.updatedAt),
    };

    if (!existingGlobal) {
      await db.insert(financeBudgets).values(budgetData);
    } else if (
      new Date(budget.updatedAt) > new Date(existingGlobal.updatedAt)
    ) {
      await db
        .update(financeBudgets)
        .set(budgetData)
        .where(eq(financeBudgets.id, budget.id));
    }
  }

  for (const setting of changes.userSettings) {
    const existingGlobal = await db.query.userSettings.findFirst({
      where: eq(userSettings.id, setting.id),
    });

    if (existingGlobal && existingGlobal.userId !== userId) {
      continue;
    }

    const settingData = {
      id: setting.id,
      userId,
      enabledModules: setting.enabledModules,
      updatedAt: new Date(setting.updatedAt),
    };

    if (!existingGlobal) {
      await db.insert(userSettings).values(settingData);
    } else if (
      new Date(setting.updatedAt) > new Date(existingGlobal.updatedAt)
    ) {
      await db
        .update(userSettings)
        .set(settingData)
        .where(eq(userSettings.id, setting.id));
    }
  }

  const newCards = await db.query.languageCards.findMany({
    where: and(
      eq(languageCards.userId, userId),
      gt(languageCards.updatedAt, lastSyncDate),
    ),
  });

  const newTransactions = await db.query.financeTransactions.findMany({
    where: and(
      eq(financeTransactions.userId, userId),
      gt(financeTransactions.updatedAt, lastSyncDate),
    ),
  });

  const newBudgets = await db.query.financeBudgets.findMany({
    where: and(
      eq(financeBudgets.userId, userId),
      gt(financeBudgets.updatedAt, lastSyncDate),
    ),
  });

  const newSettings = await db.query.userSettings.findMany({
    where: and(
      eq(userSettings.userId, userId),
      gt(userSettings.updatedAt, lastSyncDate),
    ),
  });

  return {
    success: true,
    serverTimestamp: new Date().toISOString(),
    pulled: {
      languageCards: newCards,
      financeTransactions: newTransactions,
      financeBudgets: newBudgets,
      userSettings: newSettings,
    },
  };
}
