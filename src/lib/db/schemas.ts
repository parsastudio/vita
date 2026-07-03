import { z } from "zod";

export const languageCardSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  originalText: z.string(),
  translation: z.string(),
  focusWord: z.string(),
  srsStatus: z.enum(["active", "archived", "queued"]),
  difficulty: z.number(),
  stability: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.number(),
  due: z.date(),
  lastReview: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  synced: z.boolean(),
  learningSteps: z.number(),
});

export const financeTransactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  amount: z.number(),
  type: z.enum(["income", "expense"]),
  category: z.string(),
  tags: z.array(z.string()),
  description: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  synced: z.boolean(),
});

export const financeBudgetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  categoryOrTag: z.string(),
  limitAmount: z.number(),
  period: z.enum(["monthly"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  synced: z.boolean(),
});

export const userSettingsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  enabledModules: z.array(z.string()),
  dailyNewWordsLimit: z.number().int().min(1).max(50).default(10),
  lastNewWordsDate: z.string().nullable().optional(),
  todayNewWordsCount: z.number().int().min(0).default(0),
  updatedAt: z.date(),
  synced: z.boolean(),
});

export const deletedRecordSchema = z.object({
  id: z.string().uuid(),
  tableName: z.string(),
  deletedAt: z.date(),
  synced: z.boolean(),
});

export type LanguageCard = z.infer<typeof languageCardSchema>;
export type FinanceTransaction = z.infer<typeof financeTransactionSchema>;
export type FinanceBudget = z.infer<typeof financeBudgetSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type DeletedRecord = z.infer<typeof deletedRecordSchema>;
