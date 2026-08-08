"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface NavigatorWithRelatedApps extends Navigator {
  standalone?: boolean;
  getInstalledRelatedApps?: () => Promise<
    Array<{ id?: string; platform?: string; url?: string }>
  >;
}

export type PwaModalMode = "ios" | "desktop_guide" | "already_installed" | null;

export function usePwa() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [modalMode, setModalMode] = useState<PwaModalMode>(null);
  const [isAlreadyInstalledRelated, setIsAlreadyInstalledRelated] =
    useState(false);

  const [isStandalone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const nav = window.navigator as NavigatorWithRelatedApps;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true
    );
  });

  const [isIos] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const userAgent = window.navigator.userAgent;
    return /iphone|ipad|ipod/i.test(userAgent);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkInstalledRelated = async () => {
      const nav = window.navigator as NavigatorWithRelatedApps;
      if (typeof nav.getInstalledRelatedApps === "function") {
        try {
          const apps = await nav.getInstalledRelatedApps();
          if (apps && apps.length > 0) {
            setIsAlreadyInstalledRelated(true);
          }
        } catch {
          setIsAlreadyInstalledRelated(false);
        }
      }
    };

    checkInstalledRelated();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = useCallback(async (): Promise<
    | "already_installed"
    | "prompt_triggered"
    | "ios_instructions"
    | "desktop_instructions"
  > => {
    if (isStandalone) {
      setModalMode("already_installed");
      return "already_installed";
    }

    if (isAlreadyInstalledRelated) {
      setModalMode("already_installed");
      return "already_installed";
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
      return "prompt_triggered";
    }

    if (isIos) {
      setModalMode("ios");
      return "ios_instructions";
    }

    setModalMode("desktop_guide");
    return "desktop_instructions";
  }, [isStandalone, isAlreadyInstalledRelated, deferredPrompt, isIos]);

  return {
    isStandalone,
    isIos,
    isAlreadyInstalledRelated,
    modalMode,
    setModalMode,
    handleInstallClick,
  };
}
