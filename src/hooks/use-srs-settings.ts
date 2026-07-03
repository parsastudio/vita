"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { v4 as uuidv4 } from "uuid";

export function useSrsSettings() {
  const { user } = useAuth();
  const userId = user?.id || "guest";

  const settings = useLiveQuery(() => {
    return localDb.userSettings.where("userId").equals(userId).first();
  }, [userId]);

  const dailyNewWordsLimit = settings?.dailyNewWordsLimit ?? 10;
  const todayNewWordsCount = settings?.todayNewWordsCount ?? 0;

  const updateDailyLimit = async (limit: number) => {
    const current = await localDb.userSettings
      .where("userId")
      .equals(userId)
      .first();
    if (current) {
      await localDb.userSettings.put({
        ...current,
        dailyNewWordsLimit: limit,
        updatedAt: new Date(),
        synced: false,
      });
    } else {
      await localDb.userSettings.put({
        id: uuidv4(),
        userId,
        enabledModules: ["language", "finance"],
        dailyNewWordsLimit: limit,
        lastNewWordsDate: null,
        todayNewWordsCount: 0,
        updatedAt: new Date(),
        synced: false,
      });
    }
  };

  return {
    dailyNewWordsLimit,
    todayNewWordsCount,
    updateDailyLimit,
    settings,
    userId,
  };
}
