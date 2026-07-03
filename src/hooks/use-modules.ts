"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { v4 as uuidv4 } from "uuid";

export function useModules() {
  const { user } = useAuth();
  const userId = user?.id || "guest";

  const settingsRecord = useLiveQuery(() => {
    return localDb.userSettings.where("userId").equals(userId).first();
  }, [userId]);

  const enabledModules = settingsRecord?.enabledModules || [
    "language",
    "finance",
  ];
  const settingsId = settingsRecord?.id || "";

  useEffect(() => {
    if (settingsRecord === undefined) return;
    if (!settingsRecord) {
      const newId = uuidv4();
      localDb.userSettings.put({
        id: newId,
        userId,
        enabledModules: ["language", "finance"],
        dailyNewWordsLimit: 10,
        lastNewWordsDate: null,
        todayNewWordsCount: 0,
        updatedAt: new Date(),
        synced: false,
      });
    }
  }, [settingsRecord, userId]);

  const toggleModule = async (moduleId: string) => {
    const updated = enabledModules.includes(moduleId)
      ? enabledModules.filter((id: string) => id !== moduleId)
      : [...enabledModules, moduleId];

    await localDb.userSettings.put({
      id: settingsId || uuidv4(),
      userId,
      enabledModules: updated,
      dailyNewWordsLimit: settingsRecord?.dailyNewWordsLimit ?? 10,
      lastNewWordsDate: settingsRecord?.lastNewWordsDate ?? null,
      todayNewWordsCount: settingsRecord?.todayNewWordsCount ?? 0,
      updatedAt: new Date(),
      synced: false,
    });
  };

  return { enabledModules, toggleModule };
}
