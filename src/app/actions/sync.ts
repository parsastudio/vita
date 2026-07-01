import { db } from "@/lib/db/server";
import {
  languageCards,
  financeTransactions,
  financeBudgets,
  userSettings,
} from "@/lib/db/schema";
import { eq, and, gt, inArray, sql } from "drizzle-orm";
import { getCurrentUserAction } from "@/app/actions/auth";

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

  const sessionUser = await getCurrentUserAction();
  if (!sessionUser || sessionUser.id !== userId) {
    throw new Error("Unauthorized");
  }

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

  const cardsToUpsert = changes.languageCards.map((card) => ({
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
  }));

  if (cardsToUpsert.length > 0) {
    await db
      .insert(languageCards)
      .values(cardsToUpsert)
      .onConflictDoUpdate({
        target: languageCards.id,
        set: {
          originalText: sql`EXCLUDED.original_text`,
          translation: sql`EXCLUDED.translation`,
          focusWord: sql`EXCLUDED.focus_word`,
          isSentenceTranslation: sql`EXCLUDED.is_sentence_translation`,
          srsStatus: sql`EXCLUDED.srs_status`,
          nextReviewAt: sql`EXCLUDED.next_review_at`,
          intervalDays: sql`EXCLUDED.interval_days`,
          easeFactor: sql`EXCLUDED.ease_factor`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
        where: sql`EXCLUDED.updated_at > language_cards.updated_at AND language_cards.user_id = ${userId}`,
      });
  }

  const txsToUpsert = changes.financeTransactions.map((tx) => ({
    id: tx.id,
    userId,
    amount: String(tx.amount),
    type: tx.type,
    category: tx.category,
    tags: tx.tags,
    description: tx.description,
    createdAt: new Date(tx.createdAt),
    updatedAt: new Date(tx.updatedAt),
  }));

  if (txsToUpsert.length > 0) {
    await db
      .insert(financeTransactions)
      .values(txsToUpsert)
      .onConflictDoUpdate({
        target: financeTransactions.id,
        set: {
          amount: sql`EXCLUDED.amount`,
          type: sql`EXCLUDED.type`,
          category: sql`EXCLUDED.category`,
          tags: sql`EXCLUDED.tags`,
          description: sql`EXCLUDED.description`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
        where: sql`EXCLUDED.updated_at > finance_transactions.updated_at AND finance_transactions.user_id = ${userId}`,
      });
  }

  const budgetsToUpsert = changes.financeBudgets.map((b) => ({
    id: b.id,
    userId,
    categoryOrTag: b.categoryOrTag,
    limitAmount: String(b.limitAmount),
    period: b.period,
    createdAt: new Date(b.createdAt),
    updatedAt: new Date(b.updatedAt),
  }));

  if (budgetsToUpsert.length > 0) {
    await db
      .insert(financeBudgets)
      .values(budgetsToUpsert)
      .onConflictDoUpdate({
        target: financeBudgets.id,
        set: {
          categoryOrTag: sql`EXCLUDED.category_or_tag`,
          limitAmount: sql`EXCLUDED.limit_amount`,
          period: sql`EXCLUDED.period`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
        where: sql`EXCLUDED.updated_at > finance_budgets.updated_at AND finance_budgets.user_id = ${userId}`,
      });
  }

  const settingsToUpsert = changes.userSettings.map((s) => ({
    id: s.id,
    userId,
    enabledModules: s.enabledModules,
    updatedAt: new Date(s.updatedAt),
  }));

  if (settingsToUpsert.length > 0) {
    await db
      .insert(userSettings)
      .values(settingsToUpsert)
      .onConflictDoUpdate({
        target: userSettings.id,
        set: {
          enabledModules: sql`EXCLUDED.enabled_modules`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
        where: sql`EXCLUDED.updated_at > user_settings.updated_at AND user_settings.user_id = ${userId}`,
      });
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
