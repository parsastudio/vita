"use server";

import "server-only";
import { db } from "@/lib/db/server";
import {
  languageCards,
  financeTransactions,
  financeBudgets,
  userSettings,
  deletedRecords,
} from "@/lib/db/schema";
import { eq, and, gt, inArray, sql } from "drizzle-orm";
import { getCurrentUserAction } from "@/app/actions/auth";
import { z } from "zod";

function parseDate(val: unknown): Date {
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

const syncLanguageCardSchema = z.object({
  id: z.string().uuid(),
  originalText: z.string(),
  translation: z.string(),
  focusWord: z.string(),
  srsStatus: z.string(),
  difficulty: z.number().or(z.string()).optional().nullable().default(0.5),
  stability: z.number().or(z.string()).optional().nullable().default(1.0),
  elapsedDays: z.number().optional().nullable().default(0),
  scheduledDays: z.number().optional().nullable().default(0),
  reps: z.number().optional().nullable().default(0),
  lapses: z.number().optional().nullable().default(0),
  state: z.number().optional().nullable().default(0),
  due: z.unknown(),
  lastReview: z.unknown().optional().nullable(),
  createdAt: z.unknown(),
  updatedAt: z.unknown(),
  learningSteps: z.number().optional().nullable().default(0),
});

const syncFinanceTransactionSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().or(z.string()),
  type: z.string(),
  category: z.string(),
  tags: z.array(z.string()).optional().nullable().default([]),
  description: z.string().optional().nullable().default(""),
  createdAt: z.unknown(),
  updatedAt: z.unknown(),
});

const syncFinanceBudgetSchema = z.object({
  id: z.string().uuid(),
  categoryOrTag: z.string(),
  limitAmount: z.number().or(z.string()),
  period: z.string(),
  createdAt: z.unknown(),
  updatedAt: z.unknown(),
});

const syncUserSettingsSchema = z.object({
  id: z.string().uuid(),
  enabledModules: z.array(z.string()),
  updatedAt: z.unknown(),
});

const syncDeletedRecordSchema = z.object({
  id: z.string().uuid(),
  tableName: z.string(),
  deletedAt: z.unknown(),
});

const syncPayloadSchema = z.object({
  userId: z.string().uuid(),
  lastSyncedAt: z.string().nullable().optional(),
  languageCards: z.array(syncLanguageCardSchema),
  financeTransactions: z.array(syncFinanceTransactionSchema),
  financeBudgets: z.array(syncFinanceBudgetSchema),
  userSettings: z.array(syncUserSettingsSchema),
  deletedRecords: z.array(syncDeletedRecordSchema),
  pushOnly: z.boolean().optional(),
});

export async function syncData(rawPayload: unknown) {
  const parsed = syncPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new Error("Invalid sync payload structure");
  }

  const payload = parsed.data;
  const { userId, lastSyncedAt, pushOnly, ...changes } = payload;

  const sessionUser = await getCurrentUserAction();
  if (!sessionUser || sessionUser.id !== userId) {
    throw new Error("Unauthorized");
  }

  const serverTimestamp = new Date();
  const lastSyncDate = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);

  await db.transaction(async (tx) => {
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
        await tx
          .delete(languageCards)
          .where(
            and(
              eq(languageCards.userId, userId),
              inArray(languageCards.id, cardIdsToDelete),
            ),
          );
      }
      if (txIdsToDelete.length > 0) {
        await tx
          .delete(financeTransactions)
          .where(
            and(
              eq(financeTransactions.userId, userId),
              inArray(financeTransactions.id, txIdsToDelete),
            ),
          );
      }
      if (budgetIdsToDelete.length > 0) {
        await tx
          .delete(financeBudgets)
          .where(
            and(
              eq(financeBudgets.userId, userId),
              inArray(financeBudgets.id, budgetIdsToDelete),
            ),
          );
      }

      const tbs = changes.deletedRecords.map((r) => ({
        id: r.id,
        userId,
        tableName: r.tableName,
        deletedAt: parseDate(r.deletedAt),
      }));

      await tx.insert(deletedRecords).values(tbs).onConflictDoNothing();
    }

    const cardsToUpsert = changes.languageCards.map((card) => ({
      id: card.id,
      userId,
      originalText: card.originalText,
      translation: card.translation,
      focusWord: card.focusWord,
      srsStatus: card.srsStatus,
      difficulty: String(card.difficulty ?? 0.5),
      stability: String(card.stability ?? 1.0),
      elapsedDays: card.elapsedDays ?? 0,
      scheduledDays: card.scheduledDays ?? 0,
      reps: card.reps ?? 0,
      lapses: card.lapses ?? 0,
      state: card.state ?? 0,
      due: parseDate(card.due),
      lastReview: card.lastReview ? parseDate(card.lastReview) : null,
      createdAt: parseDate(card.createdAt),
      updatedAt: parseDate(card.updatedAt),
      learningSteps: card.learningSteps ?? 0,
    }));

    if (cardsToUpsert.length > 0) {
      await tx
        .insert(languageCards)
        .values(cardsToUpsert)
        .onConflictDoUpdate({
          target: languageCards.id,
          set: {
            originalText: sql`EXCLUDED.original_text`,
            translation: sql`EXCLUDED.translation`,
            focusWord: sql`EXCLUDED.focus_word`,
            srsStatus: sql`EXCLUDED.srs_status`,
            difficulty: sql`EXCLUDED.difficulty`,
            stability: sql`EXCLUDED.stability`,
            elapsedDays: sql`EXCLUDED.elapsed_days`,
            scheduledDays: sql`EXCLUDED.scheduled_days`,
            reps: sql`EXCLUDED.reps`,
            lapses: sql`EXCLUDED.lapses`,
            state: sql`EXCLUDED.state`,
            due: sql`EXCLUDED.due`,
            lastReview: sql`EXCLUDED.last_review`,
            updatedAt: sql`EXCLUDED.updated_at`,
            learningSteps: sql`EXCLUDED.learning_steps`,
          },
          where: sql`EXCLUDED.updated_at > ${languageCards.updatedAt} AND ${languageCards.userId} = ${userId}`,
        });
    }

    const txsToUpsert = changes.financeTransactions.map((t) => ({
      id: t.id,
      userId,
      amount: String(t.amount),
      type: t.type,
      category: t.category,
      tags: t.tags || [],
      description: t.description || "",
      createdAt: parseDate(t.createdAt),
      updatedAt: parseDate(t.updatedAt),
    }));

    if (txsToUpsert.length > 0) {
      await tx
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
          where: sql`EXCLUDED.updated_at > ${financeTransactions.updatedAt} AND ${financeTransactions.userId} = ${userId}`,
        });
    }

    const budgetsToUpsert = changes.financeBudgets.map((b) => ({
      id: b.id,
      userId,
      categoryOrTag: b.categoryOrTag,
      limitAmount: String(b.limitAmount),
      period: b.period,
      createdAt: parseDate(b.createdAt),
      updatedAt: parseDate(b.updatedAt),
    }));

    if (budgetsToUpsert.length > 0) {
      await tx
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
          where: sql`EXCLUDED.updated_at > ${financeBudgets.updatedAt} AND ${financeBudgets.userId} = ${userId}`,
        });
    }

    const settingsToUpsert = changes.userSettings.map((s) => ({
      id: s.id,
      userId,
      enabledModules: s.enabledModules,
      updatedAt: parseDate(s.updatedAt),
    }));

    if (settingsToUpsert.length > 0) {
      await tx
        .insert(userSettings)
        .values(settingsToUpsert)
        .onConflictDoUpdate({
          target: userSettings.id,
          set: {
            enabledModules: sql`EXCLUDED.enabled_modules`,
            updatedAt: sql`EXCLUDED.updated_at`,
          },
          where: sql`EXCLUDED.updated_at > ${userSettings.updatedAt} AND ${userSettings.userId} = ${userId}`,
        });
    }
  });

  if (pushOnly) {
    return {
      success: true,
      serverTimestamp: serverTimestamp.toISOString(),
      pulled: {
        languageCards: [],
        financeTransactions: [],
        financeBudgets: [],
        userSettings: [],
        deletedRecords: [],
      },
    };
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

  const pulledDeletes = await db.query.deletedRecords.findMany({
    where: and(
      eq(deletedRecords.userId, userId),
      gt(deletedRecords.deletedAt, lastSyncDate),
    ),
  });

  return {
    success: true,
    serverTimestamp: serverTimestamp.toISOString(),
    pulled: {
      languageCards: newCards,
      financeTransactions: newTransactions,
      financeBudgets: newBudgets,
      userSettings: newSettings,
      deletedRecords: pulledDeletes,
    },
  };
}
