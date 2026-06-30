"use server";

import { db } from "@/lib/db/server";
import {
  languageCards,
  financeTransactions,
  financeBudgets,
  userSettings,
} from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

interface SyncPayload {
  userId: string;
  lastSyncedAt: string | null;
  languageCards: any[];
  financeTransactions: any[];
  financeBudgets: any[];
  userSettings: any[];
}

export async function syncData(payload: SyncPayload) {
  const { userId, lastSyncedAt, ...changes } = payload;
  const lastSyncDate = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);

  for (const card of changes.languageCards) {
    const existing = await db.query.languageCards.findFirst({
      where: eq(languageCards.id, card.id),
    });

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

    if (!existing) {
      await db.insert(languageCards).values(cardData);
    } else if (new Date(card.updatedAt) > new Date(existing.updatedAt)) {
      await db
        .update(languageCards)
        .set(cardData)
        .where(eq(languageCards.id, card.id));
    }
  }

  for (const tx of changes.financeTransactions) {
    const existing = await db.query.financeTransactions.findFirst({
      where: eq(financeTransactions.id, tx.id),
    });

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

    if (!existing) {
      await db.insert(financeTransactions).values(txData);
    } else if (new Date(tx.updatedAt) > new Date(existing.updatedAt)) {
      await db
        .update(financeTransactions)
        .set(txData)
        .where(eq(financeTransactions.id, tx.id));
    }
  }

  for (const budget of changes.financeBudgets) {
    const existing = await db.query.financeBudgets.findFirst({
      where: eq(financeBudgets.id, budget.id),
    });

    const budgetData = {
      id: budget.id,
      userId,
      categoryOrTag: budget.categoryOrTag,
      limitAmount: String(budget.limitAmount),
      period: budget.period,
      createdAt: new Date(budget.createdAt),
      updatedAt: new Date(budget.updatedAt),
    };

    if (!existing) {
      await db.insert(financeBudgets).values(budgetData);
    } else if (new Date(budget.updatedAt) > new Date(existing.updatedAt)) {
      await db
        .update(financeBudgets)
        .set(budgetData)
        .where(eq(financeBudgets.id, budget.id));
    }
  }

  for (const setting of changes.userSettings) {
    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.id, setting.id),
    });

    const settingData = {
      id: setting.id,
      userId,
      enabledModules: setting.enabledModules,
      updatedAt: new Date(setting.updatedAt),
    };

    if (!existing) {
      await db.insert(userSettings).values(settingData);
    } else if (new Date(setting.updatedAt) > new Date(existing.updatedAt)) {
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
