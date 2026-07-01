"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { localDb, subscribeToDbChanges } from "@/lib/db/client";
import { syncData } from "@/app/actions/sync";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/hooks/use-toast";

export function useSync() {
  const { user, isGuest } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isSyncingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSync = useCallback(async () => {
    if (!user || isGuest || isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    setError(null);

    try {
      const lastSyncedKey = `last_synced_at_${user.id}`;
      const lastSyncedAt = localStorage.getItem(lastSyncedKey);

      const unsyncedCards = await localDb.languageCards
        .where("userId")
        .equals(user.id)
        .filter((c) => !c.synced)
        .toArray();
      const unsyncedTransactions = await localDb.financeTransactions
        .where("userId")
        .equals(user.id)
        .filter((t) => !t.synced)
        .toArray();
      const unsyncedBudgets = await localDb.financeBudgets
        .where("userId")
        .equals(user.id)
        .filter((b) => !b.synced)
        .toArray();
      const unsyncedSettings = await localDb.userSettings
        .where("userId")
        .equals(user.id)
        .filter((s) => !s.synced)
        .toArray();
      const unsyncedDeletes = await localDb.deletedRecords
        .filter((d) => !d.synced)
        .toArray();

      const response = await syncData({
        userId: user.id,
        lastSyncedAt,
        languageCards: unsyncedCards,
        financeTransactions: unsyncedTransactions,
        financeBudgets: unsyncedBudgets,
        userSettings: unsyncedSettings,
        deletedRecords: unsyncedDeletes.map((d) => ({
          id: d.id,
          tableName: d.tableName,
          deletedAt: d.deletedAt,
        })),
      });

      if (response && response.success) {
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
              if (
                current &&
                current.updatedAt.getTime() === tx.updatedAt.getTime()
              ) {
                await localDb.financeTransactions.update(tx.id, {
                  synced: true,
                });
              }
            }

            for (const b of unsyncedBudgets) {
              const current = await localDb.financeBudgets.get(b.id);
              if (
                current &&
                current.updatedAt.getTime() === b.updatedAt.getTime()
              ) {
                await localDb.financeBudgets.update(b.id, { synced: true });
              }
            }

            for (const s of unsyncedSettings) {
              const current = await localDb.userSettings.get(s.id);
              if (
                current &&
                current.updatedAt.getTime() === s.updatedAt.getTime()
              ) {
                await localDb.userSettings.update(s.id, { synced: true });
              }
            }

            const deleteIds = unsyncedDeletes.map((d) => d.id);
            if (deleteIds.length > 0) {
              await localDb.deletedRecords
                .where("id")
                .anyOf(deleteIds)
                .delete();
            }

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
              if (
                !local ||
                new Date(card.updatedAt) > new Date(local.updatedAt)
              ) {
                await localDb.languageCards.put({
                  id: card.id,
                  userId: user.id,
                  originalText: card.originalText,
                  translation: card.translation,
                  focusWord: card.focusWord,
                  srsStatus: card.srsStatus as "active" | "archived",
                  difficulty: Number(card.difficulty),
                  createdAt: new Date(card.createdAt),
                  updatedAt: new Date(card.updatedAt),
                  synced: true,
                });
              }
            }

            for (const tx of response.pulled.financeTransactions) {
              const local = await localDb.financeTransactions.get(tx.id);
              if (
                !local ||
                new Date(tx.updatedAt) > new Date(local.updatedAt)
              ) {
                await localDb.financeTransactions.put({
                  id: tx.id,
                  userId: user.id,
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
                  userId: user.id,
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
                  userId: user.id,
                  enabledModules: s.enabledModules,
                  updatedAt: new Date(s.updatedAt),
                  synced: true,
                });
              }
            }
          },
        );

        localStorage.setItem(lastSyncedKey, response.serverTimestamp);
        toast("همگام‌سازی با سرور ابری با موفقیت انجام شد", "success");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Sync failed";
      setError(errMsg);
      toast(
        "خطا در همگام‌سازی ابری. برنامه در حالت آفلاین کار می‌کند.",
        "error",
      );
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [user, isGuest, toast]);

  const syncRef = useRef(performSync);
  useEffect(() => {
    syncRef.current = performSync;
  }, [performSync]);

  const prevUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (user && !isGuest && prevUserRef.current !== user.id) {
      prevUserRef.current = user.id;
      performSync();
    } else if (!user) {
      prevUserRef.current = null;
    }
  }, [user, isGuest, performSync]);

  useEffect(() => {
    if (isGuest || !user) return;

    const unsubscribe = subscribeToDbChanges(() => {
      if (isSyncingRef.current) return;

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        if (isSyncingRef.current || isGuest || !user) return;
        performSync();
      }, 1000);
    });

    return () => {
      unsubscribe();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [user, isGuest, performSync]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      syncRef.current();
    };

    window.addEventListener("online", handleOnline);
    handleOnline();

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return { performSync, isSyncing, error };
}
