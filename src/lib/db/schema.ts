import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
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
    isSentenceTranslation: boolean("is_sentence_translation")
      .default(false)
      .notNull(),
    srsStatus: varchar("srs_status", { length: 50 }).default("hard").notNull(),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
    intervalDays: numeric("interval_days").default("0").notNull(),
    easeFactor: numeric("ease_factor").default("2.5").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("language_cards_user_id_idx").on(table.userId)],
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
  (table) => [index("finance_transactions_user_id_idx").on(table.userId)],
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
  (table) => [index("finance_budgets_user_id_idx").on(table.userId)],
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    enabledModules: text("enabled_modules").array().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("user_settings_user_id_idx").on(table.userId)],
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
  (table) => [index("deleted_records_user_id_idx").on(table.userId)],
);
