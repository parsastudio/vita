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

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function usePwa() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  const [isStandalone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const nav = window.navigator as NavigatorWithStandalone;
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

  const [isInAppBrowser] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const userAgent = window.navigator.userAgent;
    return /FBAV|Instagram|Telegram|Line|Twitter|MicroMessenger/i.test(
      userAgent,
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
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
    | "prompt_triggered"
    | "ios_instructions"
    | "already_installed"
    | "unsupported"
  > => {
    if (isStandalone) {
      return "already_installed";
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
      return "prompt_triggered";
    }

    if (isIos) {
      setShowIosModal(true);
      return "ios_instructions";
    }

    return "unsupported";
  }, [isStandalone, deferredPrompt, isIos]);

  return {
    isInstallable,
    isStandalone,
    isIos,
    isInAppBrowser,
    showIosModal,
    setShowIosModal,
    handleInstallClick,
  };
}
