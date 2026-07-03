"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";

export function useSrsSettings() {
  const { user } = useAuth();
  const userId = user?.id || "guest";

  const settings = useLiveQuery(() => {
    return localDb.userSettings.where("userId").equals(userId).first();
  }, [userId]);

  const dailyNewWordsLimit = settings?.dailyNewWordsLimit ?? 10;
  const todayNewWordsCount = settings?.todayNewWordsCount ?? 0;

  const updateDailyLimit = async (limit: number) => {
    if (!settings) return;
    await localDb.userSettings.update(settings.id, {
      dailyNewWordsLimit: limit,
      updatedAt: new Date(),
      synced: false,
    });
  };

  return {
    dailyNewWordsLimit,
    todayNewWordsCount,
    updateDailyLimit,
    settings,
    userId,
  };
}
