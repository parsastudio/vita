"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  localDb,
  subscribeToDbChanges,
  setDatabaseSyncingActive,
} from "@/lib/db/client";
import { syncData } from "@/app/actions/sync";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  updateLocalDbAfterSync,
  type PulledData,
} from "@/lib/db/sync-db-updater";

export function useSync() {
  const { user, isGuest } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isSyncingRef = useRef(false);
  const pendingSyncRef = useRef(false);
  const syncOptionsRef = useRef<{ pushOnly?: boolean } | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSync = useCallback(
    async (options?: { pushOnly?: boolean }) => {
      const pushOnly = options?.pushOnly ?? false;
      if (!user || isGuest) return;

      if (isSyncingRef.current) {
        pendingSyncRef.current = true;
        syncOptionsRef.current = {
          pushOnly:
            syncOptionsRef.current?.pushOnly === false ? false : pushOnly,
        };
        return;
      }

      isSyncingRef.current = true;
      setIsSyncing(true);
      setError(null);
      setDatabaseSyncingActive(true);

      try {
        const lastSyncedKey = `last_synced_at_${user.id}`;

        const cardCount = await localDb.languageCards
          .where("userId")
          .equals(user.id)
          .count();
        const txCount = await localDb.financeTransactions
          .where("userId")
          .equals(user.id)
          .count();
        const budgetCount = await localDb.financeBudgets
          .where("userId")
          .equals(user.id)
          .count();

        let lastSyncedAt = localStorage.getItem(lastSyncedKey);
        if (cardCount === 0 && txCount === 0 && budgetCount === 0) {
          lastSyncedAt = null;
        }

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

        if (
          pushOnly &&
          unsyncedCards.length === 0 &&
          unsyncedTransactions.length === 0 &&
          unsyncedBudgets.length === 0 &&
          unsyncedSettings.length === 0 &&
          unsyncedDeletes.length === 0
        ) {
          setIsSyncing(false);
          isSyncingRef.current = false;
          setDatabaseSyncingActive(false);
          return;
        }

        const response = await syncData({
          userId: user.id,
          lastSyncedAt,
          pushOnly,
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
          await updateLocalDbAfterSync(
            unsyncedCards,
            unsyncedTransactions,
            unsyncedBudgets,
            unsyncedSettings,
            unsyncedDeletes,
            response as { pulled: PulledData; serverTimestamp: string },
            user.id,
            pushOnly,
            lastSyncedKey,
          );

          if (!pushOnly) {
            toast("همگام‌سازی با سرور ابری با موفقیت انجام شد", "success");
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Sync failed";
        setError(errMsg);
      }
      {
        setIsSyncing(false);
        isSyncingRef.current = false;
        setDatabaseSyncingActive(false);

        if (pendingSyncRef.current) {
          pendingSyncRef.current = false;
          const nextOptions = syncOptionsRef.current || undefined;
          syncOptionsRef.current = null;
          performSync(nextOptions);
        }
      }
    },
    [user, isGuest, toast],
  );

  const syncRef = useRef(performSync);
  useEffect(() => {
    syncRef.current = performSync;
  }, [performSync]);

  const prevUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (user && !isGuest && prevUserRef.current !== user.id) {
      prevUserRef.current = user.id;
      performSync({ pushOnly: false });
    } else if (!user) {
      prevUserRef.current = null;
    }
  }, [user, isGuest, performSync]);

  useEffect(() => {
    if (isGuest || !user) return;

    const unsubscribe = subscribeToDbChanges(() => {
      if (isSyncingRef.current) {
        pendingSyncRef.current = true;
        syncOptionsRef.current = { pushOnly: true };
        return;
      }

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        if (isSyncingRef.current || isGuest || !user) return;
        performSync({ pushOnly: true });
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
      syncRef.current({ pushOnly: false });
    };

    window.addEventListener("online", handleOnline);
    handleOnline();

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return { performSync, isSyncing, error };
}
