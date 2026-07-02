import {
  localDb,
  LanguageCard,
  FinanceTransaction,
  FinanceBudget,
  UserSettings,
  DeletedRecord,
} from "./client";

export interface PulledData {
  languageCards: {
    id: string;
    originalText: string;
    translation: string;
    focusWord: string;
    srsStatus: string;
    difficulty: string | number;
    stability: string | number;
    elapsedDays: number;
    scheduledDays: number;
    reps: number;
    lapses: number;
    state: number;
    due: string | Date;
    lastReview: string | Date | null;
    createdAt: string | Date;
    updatedAt: string | Date;
  }[];
  financeTransactions: {
    id: string;
    amount: string | number;
    type: string;
    category: string;
    tags: string[];
    description: string;
    createdAt: string | Date;
    updatedAt: string | Date;
  }[];
  financeBudgets: {
    id: string;
    categoryOrTag: string;
    limitAmount: string | number;
    period: string;
    createdAt: string | Date;
    updatedAt: string | Date;
  }[];
  userSettings: {
    id: string;
    enabledModules: string[];
    updatedAt: string | Date;
  }[];
  deletedRecords: {
    id: string;
    tableName: string;
    deletedAt: string | Date;
  }[];
}

export async function updateLocalDbAfterSync(
  unsyncedCards: LanguageCard[],
  unsyncedTransactions: FinanceTransaction[],
  unsyncedBudgets: FinanceBudget[],
  unsyncedSettings: UserSettings[],
  unsyncedDeletes: DeletedRecord[],
  response: {
    pulled: PulledData;
    serverTimestamp: string;
  },
  userId: string,
  pushOnly: boolean,
  lastSyncedKey: string,
): Promise<void> {
  await localDb.transaction(
    "rw",
    [
      localDb.languageCards,
      localDb.financeTransactions,
      localDb.financeBudgets,
      localDb.userSettings,
      localDb.deletedRecords,
    ],
    async () => {
      for (const card of unsyncedCards) {
        const current = await localDb.languageCards.get(card.id);
        if (
          current &&
          current.updatedAt.getTime() === card.updatedAt.getTime()
        ) {
          await localDb.languageCards.update(card.id, { synced: true });
        }
      }

      for (const tx of unsyncedTransactions) {
        const current = await localDb.financeTransactions.get(tx.id);
        if (current && current.updatedAt.getTime() === tx.updatedAt.getTime()) {
          await localDb.financeTransactions.update(tx.id, {
            synced: true,
          });
        }
      }

      for (const b of unsyncedBudgets) {
        const current = await localDb.financeBudgets.get(b.id);
        if (current && current.updatedAt.getTime() === b.updatedAt.getTime()) {
          await localDb.financeBudgets.update(b.id, { synced: true });
        }
      }

      for (const s of unsyncedSettings) {
        const current = await localDb.userSettings.get(s.id);
        if (current && current.updatedAt.getTime() === s.updatedAt.getTime()) {
          await localDb.userSettings.update(s.id, { synced: true });
        }
      }

      const deleteIds = unsyncedDeletes.map((d) => d.id);
      if (deleteIds.length > 0) {
        await localDb.deletedRecords.where("id").anyOf(deleteIds).delete();
      }

      if (!pushOnly) {
        if (
          response.pulled.deletedRecords &&
          response.pulled.deletedRecords.length > 0
        ) {
          for (const r of response.pulled.deletedRecords) {
            if (r.tableName === "languageCards") {
              await localDb.languageCards.delete(r.id);
            } else if (r.tableName === "financeTransactions") {
              await localDb.financeTransactions.delete(r.id);
            } else if (r.tableName === "financeBudgets") {
              await localDb.financeBudgets.delete(r.id);
            }
          }
        }

        for (const card of response.pulled.languageCards) {
          const local = await localDb.languageCards.get(card.id);
          if (!local || new Date(card.updatedAt) > new Date(local.updatedAt)) {
            await localDb.languageCards.put({
              id: card.id,
              userId,
              originalText: card.originalText,
              translation: card.translation,
              focusWord: card.focusWord,
              srsStatus: card.srsStatus as "active" | "archived",
              difficulty: Number(card.difficulty),
              stability: Number(card.stability),
              elapsedDays: Number(card.elapsedDays),
              scheduledDays: Number(card.scheduledDays),
              reps: Number(card.reps),
              lapses: Number(card.lapses),
              state: Number(card.state),
              due: new Date(card.due),
              lastReview: card.lastReview ? new Date(card.lastReview) : null,
              createdAt: new Date(card.createdAt),
              updatedAt: new Date(card.updatedAt),
              synced: true,
            });
          }
        }

        for (const tx of response.pulled.financeTransactions) {
          const local = await localDb.financeTransactions.get(tx.id);
          if (!local || new Date(tx.updatedAt) > new Date(local.updatedAt)) {
            await localDb.financeTransactions.put({
              id: tx.id,
              userId,
              amount: Number(tx.amount),
              type: tx.type as "income" | "expense",
              category: tx.category,
              tags: tx.tags,
              description: tx.description,
              createdAt: new Date(tx.createdAt),
              updatedAt: new Date(tx.updatedAt),
              synced: true,
            });
          }
        }

        for (const b of response.pulled.financeBudgets) {
          const local = await localDb.financeBudgets.get(b.id);
          if (!local || new Date(b.updatedAt) > new Date(local.updatedAt)) {
            await localDb.financeBudgets.put({
              id: b.id,
              userId,
              categoryOrTag: b.categoryOrTag,
              limitAmount: Number(b.limitAmount),
              period: b.period as "monthly",
              createdAt: new Date(b.createdAt),
              updatedAt: new Date(b.updatedAt),
              synced: true,
            });
          }
        }

        for (const s of response.pulled.userSettings) {
          const local = await localDb.userSettings.get(s.id);
          if (!local || new Date(s.updatedAt) > new Date(local.updatedAt)) {
            await localDb.userSettings.put({
              id: s.id,
              userId,
              enabledModules: s.enabledModules,
              updatedAt: new Date(s.updatedAt),
              synced: true,
            });
          }
        }

        localStorage.setItem(lastSyncedKey, response.serverTimestamp);
      }
    },
  );
}
