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
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState<boolean>(false);

  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const nav = window.navigator as NavigatorWithRelatedApps;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      nav.standalone === true
    );
  });

  const [isIos] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nav = window.navigator as NavigatorWithRelatedApps;

    const checkInstalledApps = async () => {
      if (typeof nav.getInstalledRelatedApps === "function") {
        try {
          const apps = await nav.getInstalledRelatedApps();
          if (apps && apps.length > 0) {
            setIsAlreadyInstalled(true);
          }
        } catch {
          setIsAlreadyInstalled(false);
        }
      }
    };

    checkInstalledApps();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setIsAlreadyInstalled(true);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (isStandalone || isAlreadyInstalled) {
      setModalMode("already_installed");
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setDeferredPrompt(null);
        setIsStandalone(true);
        setIsAlreadyInstalled(true);
      }
      return;
    }

    if (isIos) {
      setModalMode("ios");
      return;
    }

    setModalMode("already_installed");
  }, [isStandalone, isAlreadyInstalled, deferredPrompt, isIos]);

  return {
    isStandalone,
    isAlreadyInstalled,
    isIos,
    modalMode,
    setModalMode,
    handleInstallClick,
  };
}
