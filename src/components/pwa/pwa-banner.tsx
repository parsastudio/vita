"use client";

import React from "react";
import { usePwa } from "@/hooks/use-pwa";
import { Button } from "@/components/ui/button";

export function PwaBanner() {
  const { isInstallable, isStandalone, triggerInstall } = usePwa();

  if (isStandalone || !isInstallable) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-50 bg-card/90 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-300">
      <div>
        <h4 className="font-bold text-sm text-foreground">
          Get the native app experience
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          Install vita space on your device for optimized offline workflows,
          faster performance, and seamless dashboard controls.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="w-full" onClick={triggerInstall}>
          Install App
        </Button>
      </div>
    </div>
  );
}
