"use client";

import { useState, useEffect } from "react";
import { useModules } from "@/hooks/use-modules";
import { useSync } from "@/hooks/use-sync";
import { useAuth } from "@/lib/auth/auth-context";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { useTheme } from "next-themes";

export function useDashboardState() {
  const { user, isGuest, logout, disableGuestMode, isLoading } = useAuth();
  const { enabledModules, toggleModule } = useModules();
  const { isSyncing, performSync } = useSync();
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useIsMounted();
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [activeWidget, setActiveWidgetState] = useState<"language" | "finance">(
    () => {
      if (typeof window === "undefined") return "language";
      const params = new URLSearchParams(window.location.search);
      const spaceParam = params.get("space");
      if (spaceParam === "language" || spaceParam === "finance") {
        return spaceParam;
      }
      return "language";
    },
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const changeActiveWidget = (widget: "language" | "finance") => {
    setActiveWidgetState(widget);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("space", widget);
      params.delete("tab");
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(
        { ...window.history.state, as: newUrl, url: newUrl },
        "",
        newUrl,
      );
    }
  };

  const handleToggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return {
    user,
    isGuest,
    logout,
    disableGuestMode,
    isLoading,
    enabledModules,
    toggleModule,
    isSyncing,
    performSync,
    showAccountSettings,
    setShowAccountSettings,
    isOnline,
    mounted,
    activeWidget,
    setActiveWidget: changeActiveWidget,
    theme: mounted ? resolvedTheme || "light" : "",
    handleToggleTheme,
  };
}
