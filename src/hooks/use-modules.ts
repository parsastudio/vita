"use client";

import { useState, useEffect } from "react";
import { localDb } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";

export function useModules() {
  const { user } = useAuth();
  const [enabledModules, setEnabledModules] = useState<string[]>([
    "language",
    "finance",
  ]);
  const [settingsId, setSettingsId] = useState<string>("");

  useEffect(() => {
    async function loadSettings() {
      const userId = user?.id || "guest";
      const settings = await localDb.userSettings
        .where("userId")
        .equals(userId)
        .first();

      if (settings) {
        setEnabledModules(settings.enabledModules);
        setSettingsId(settings.id);
      } else {
        const newId = crypto.randomUUID();
        await localDb.userSettings.put({
          id: newId,
          userId,
          enabledModules: ["language", "finance"],
          updatedAt: new Date(),
          synced: false,
        });
        setEnabledModules(["language", "finance"]);
        setSettingsId(newId);
      }
    }
    loadSettings();
  }, [user]);

  const toggleModule = async (moduleId: string) => {
    const updated = enabledModules.includes(moduleId)
      ? enabledModules.filter((id) => id !== moduleId)
      : [...enabledModules, moduleId];

    setEnabledModules(updated);

    const userId = user?.id || "guest";
    await localDb.userSettings.put({
      id: settingsId || crypto.randomUUID(),
      userId,
      enabledModules: updated,
      updatedAt: new Date(),
      synced: false,
    });
  };

  return { enabledModules, toggleModule };
}
