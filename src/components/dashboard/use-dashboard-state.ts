"use client";

import { useState, useEffect } from "react";
import { useModules } from "@/hooks/use-modules";
import { useSync } from "@/hooks/use-sync";
import { useAuth } from "@/lib/auth/auth-context";

export function useDashboardState() {
  const { user, isGuest, logout, disableGuestMode, isLoading } = useAuth();
  const { enabledModules, toggleModule } = useModules();
  const { isSyncing, performSync } = useSync();
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<string[]>([
    "language",
    "finance",
  ]);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const savedOrder = localStorage.getItem("vita_widget_order");
    if (savedOrder) {
      setWidgetOrder(JSON.parse(savedOrder));
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const moveWidget = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= widgetOrder.length) return;
    const updated = [...widgetOrder];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    setWidgetOrder(updated);
    localStorage.setItem("vita_widget_order", JSON.stringify(updated));
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
    showSettings,
    setShowSettings,
    showUserMenu,
    setShowUserMenu,
    isOnline,
    mounted,
    widgetOrder,
    moveWidget,
  };
}
