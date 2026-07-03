import Dexie, { type Table } from "dexie";
import {
  type LanguageCard,
  type FinanceTransaction,
  type FinanceBudget,
  type UserSettings,
  type DeletedRecord,
} from "./schemas";

export {
  type LanguageCard,
  type FinanceTransaction,
  type FinanceBudget,
  type UserSettings,
  type DeletedRecord,
};

export { updateLocalDbAfterSync } from "./sync-db-updater";

class VitaLocalDatabase extends Dexie {
  languageCards!: Table<LanguageCard, string>;
  financeTransactions!: Table<FinanceTransaction, string>;
  financeBudgets!: Table<FinanceBudget, string>;
  userSettings!: Table<UserSettings, string>;
  deletedRecords!: Table<DeletedRecord, string>;

  constructor() {
    super("VitaLocalDatabase");
    this.version(4)
      .stores({
        languageCards: "id, userId, srsStatus, due, updatedAt, synced",
        financeTransactions:
          "id, userId, type, category, createdAt, updatedAt, synced",
        financeBudgets: "id, userId, categoryOrTag, updatedAt, synced",
        userSettings: "id, userId, updatedAt, synced",
        deletedRecords: "id, tableName, synced",
      })
      .upgrade(async (tx) => {
        await tx
          .table("languageCards")
          .toCollection()
          .modify((card) => {
            if (card.due === undefined) {
              card.due = card.nextReviewDate || card.updatedAt || new Date();
            }
            if (card.elapsedDays === undefined) card.elapsedDays = 0;
            if (card.scheduledDays === undefined) card.scheduledDays = 0;
            if (card.reps === undefined) card.reps = 0;
            if (card.lapses === undefined) card.lapses = 0;
            if (card.state === undefined) card.state = 0;
            if (card.lastReview === undefined) card.lastReview = null;
            if (card.learningSteps === undefined) card.learningSteps = 0;
          });
      });
  }
}

export const localDb = new VitaLocalDatabase();

export const dbChangeListeners = new Set<() => void>();

export let isDatabaseSyncingActive = false;

export function setDatabaseSyncingActive(active: boolean) {
  isDatabaseSyncingActive = active;
}

export function subscribeToDbChanges(listener: () => void) {
  dbChangeListeners.add(listener);
  return () => {
    dbChangeListeners.delete(listener);
  };
}

export function notifyDbChange() {
  dbChangeListeners.forEach((l) => l());
}

const tables = [
  "languageCards",
  "financeTransactions",
  "financeBudgets",
  "userSettings",
  "deletedRecords",
] as const;

tables.forEach((tableName) => {
  localDb[tableName].hook("creating", function () {
    if (isDatabaseSyncingActive) return;
    setTimeout(() => notifyDbChange(), 0);
  });
  localDb[tableName].hook("updating", function () {
    if (isDatabaseSyncingActive) return;
    setTimeout(() => notifyDbChange(), 0);
  });
  localDb[tableName].hook("deleting", function () {
    if (isDatabaseSyncingActive) return;
    setTimeout(() => notifyDbChange(), 0);
  });
});

if (typeof window !== "undefined") {
  localDb.open().catch((err) => {
    console.error(err);
  });
}
