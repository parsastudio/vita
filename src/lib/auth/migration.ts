import { localDb } from "@/lib/db/client";

export async function migrateGuestData(newUserId: string): Promise<void> {
  await localDb.transaction(
    "rw",
    [
      localDb.languageCards,
      localDb.financeTransactions,
      localDb.financeBudgets,
      localDb.userSettings,
    ],
    async () => {
      await localDb.languageCards
        .where("userId")
        .equals("guest")
        .modify({ userId: newUserId, synced: false, updatedAt: new Date() });

      await localDb.financeTransactions
        .where("userId")
        .equals("guest")
        .modify({ userId: newUserId, synced: false, updatedAt: new Date() });

      const existingBudgets = await localDb.financeBudgets
        .where("userId")
        .equals(newUserId)
        .toArray();

      const guestBudgets = await localDb.financeBudgets
        .where("userId")
        .equals("guest")
        .toArray();

      for (const gb of guestBudgets) {
        const matching = existingBudgets.find(
          (eb) =>
            eb.categoryOrTag.toLowerCase() === gb.categoryOrTag.toLowerCase(),
        );
        if (matching) {
          await localDb.financeBudgets.update(matching.id, {
            limitAmount: gb.limitAmount,
            updatedAt: new Date(),
            synced: false,
          });
          await localDb.financeBudgets.delete(gb.id);
        } else {
          await localDb.financeBudgets.update(gb.id, {
            userId: newUserId,
            synced: false,
            updatedAt: new Date(),
          });
        }
      }

      const existingSettings = await localDb.userSettings
        .where("userId")
        .equals(newUserId)
        .first();

      const guestSettings = await localDb.userSettings
        .where("userId")
        .equals("guest")
        .first();

      if (guestSettings) {
        if (existingSettings) {
          const mergedModules = Array.from(
            new Set([
              ...existingSettings.enabledModules,
              ...guestSettings.enabledModules,
            ]),
          );
          await localDb.userSettings.update(existingSettings.id, {
            enabledModules: mergedModules,
            updatedAt: new Date(),
            synced: false,
          });
          await localDb.userSettings.delete(guestSettings.id);
        } else {
          await localDb.userSettings.update(guestSettings.id, {
            userId: newUserId,
            synced: false,
            updatedAt: new Date(),
          });
        }
      }
    },
  );
}
