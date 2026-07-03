import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const languageCards = pgTable(
  "language_cards",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    originalText: text("original_text").notNull(),
    translation: text("translation").notNull(),
    focusWord: varchar("focus_word", { length: 255 }).notNull(),
    srsStatus: varchar("srs_status", { length: 50 })
      .default("active")
      .notNull(),
    difficulty: numeric("difficulty").default("0.5").notNull(),
    stability: numeric("stability").default("1.0").notNull(),
    elapsedDays: integer("elapsed_days").default(0).notNull(),
    scheduledDays: integer("scheduled_days").default(0).notNull(),
    reps: integer("reps").default(0).notNull(),
    lapses: integer("lapses").default(0).notNull(),
    state: integer("state").default(0).notNull(),
    due: timestamp("due", { withTimezone: true }).defaultNow().notNull(),
    lastReview: timestamp("last_review", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    learningSteps: integer("learning_steps").default(0).notNull(),
  },
  (table) => [
    index("language_cards_user_id_idx").on(table.userId),
    index("language_cards_updated_at_idx").on(table.updatedAt),
    index("language_cards_due_idx").on(table.due),
  ],
);

export const financeTransactions = pgTable(
  "finance_transactions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    category: varchar("category", { length: 255 }).notNull(),
    tags: text("tags").array().notNull(),
    description: text("description").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("finance_transactions_user_id_idx").on(table.userId),
    index("finance_transactions_updated_at_idx").on(table.updatedAt),
  ],
);

export const financeBudgets = pgTable(
  "finance_budgets",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    categoryOrTag: varchar("category_or_tag", { length: 255 }).notNull(),
    limitAmount: numeric("limit_amount", { precision: 15, scale: 2 }).notNull(),
    period: varchar("period", { length: 50 }).default("monthly").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("finance_budgets_user_id_idx").on(table.userId),
    index("finance_budgets_updated_at_idx").on(table.updatedAt),
  ],
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    enabledModules: text("enabled_modules").array().notNull(),
    dailyNewWordsLimit: integer("daily_new_words_limit").default(10).notNull(),
    lastNewWordsDate: varchar("last_new_words_date", { length: 50 }),
    todayNewWordsCount: integer("today_new_words_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_settings_user_id_idx").on(table.userId),
    index("user_settings_updated_at_idx").on(table.updatedAt),
  ],
);

export const deletedRecords = pgTable(
  "deleted_records",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    tableName: varchar("table_name", { length: 255 }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("deleted_records_user_id_idx").on(table.userId),
    index("deleted_records_deleted_at_idx").on(table.deletedAt),
  ],
);
