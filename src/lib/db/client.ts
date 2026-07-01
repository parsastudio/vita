import Dexie, { type Table } from "dexie";

export interface LanguageCard {
  id: string;
  userId: string | null;
  originalText: string;
  translation: string;
  focusWord: string;
  isSentenceTranslation: boolean;
  srsStatus: "hard" | "medium" | "easy" | "archived";
  nextReviewAt: Date;
  intervalDays: number;
  easeFactor: number;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export interface FinanceTransaction {
  id: string;
  userId: string | null;
  amount: number;
  type: "income" | "expense";
  category: string;
  tags: string[];
  description: string;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export interface FinanceBudget {
  id: string;
  userId: string | null;
  categoryOrTag: string;
  limitAmount: number;
  period: "monthly";
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export interface UserSettings {
  id: string;
  userId: string | null;
  enabledModules: string[];
  updatedAt: Date;
  synced: boolean;
}

export interface DeletedRecord {
  id: string;
  tableName: string;
  deletedAt: Date;
  synced: boolean;
}

class VitaLocalDatabase extends Dexie {
  languageCards!: Table<LanguageCard, string>;
  financeTransactions!: Table<FinanceTransaction, string>;
  financeBudgets!: Table<FinanceBudget, string>;
  userSettings!: Table<UserSettings, string>;
  deletedRecords!: Table<DeletedRecord, string>;

  constructor() {
    super("VitaLocalDatabase");
    this.version(1).stores({
      languageCards: "id, userId, srsStatus, nextReviewAt, updatedAt, synced",
      financeTransactions:
        "id, userId, type, category, createdAt, updatedAt, synced",
      financeBudgets: "id, userId, categoryOrTag, updatedAt, synced",
      userSettings: "id, userId, updatedAt, synced",
      deletedRecords: "id, tableName, synced",
    });
  }
}

export const localDb = new VitaLocalDatabase();

localDb.open().catch((err) => {
  console.error("Failed to open IndexedDB gracefully:", err);
});
