"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useModules } from "@/hooks/use-modules";
import { useSync } from "@/hooks/use-sync";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";

export function DashboardGrid({
  languageWidget,
  financeWidget,
}: {
  languageWidget: React.ReactNode;
  financeWidget: React.ReactNode;
}) {
  const { isGuest } = useAuth();
  const { enabledModules, toggleModule } = useModules();
  const { isSyncing, error, performSync } = useSync();
  const [showSettings, setShowSettings] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-vazir">
              vita space
            </h1>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-[10px] font-semibold">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? "bg-green-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span className="text-muted-foreground uppercase">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            {!isGuest && isOnline && (
              <button
                onClick={() => performSync()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isSyncing ? "Syncing..." : "Synced ✓"}</span>
              </button>
            )}

            {isGuest && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <span>Local DB Only</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Your secure personal tools, working offline by default.
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-full gap-2 text-sm"
          >
            Configure Spaces
          </Button>

          <AnimatePresence>
            {showSettings && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSettings(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl p-5 shadow-xl z-20"
                >
                  <h3 className="font-semibold text-sm text-foreground mb-4">
                    Toggle Modules
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          Language Space
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Word parsing & SRS
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={enabledModules.includes("language")}
                        onChange={() => toggleModule("language")}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          Finance Space
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Smart financial tracker
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={enabledModules.includes("finance")}
                        onChange={() => toggleModule("finance")}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <AnimatePresence mode="popLayout">
          {enabledModules.includes("language") && (
            <motion.div
              key="language"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              layout
              className="w-full"
            >
              {languageWidget}
            </motion.div>
          )}

          {enabledModules.includes("finance") && (
            <motion.div
              key="finance"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              layout
              className="w-full"
            >
              {financeWidget}
            </motion.div>
          )}
        </AnimatePresence>

        {enabledModules.length === 0 && (
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground">All spaces are disabled.</p>
            <Button
              variant="link"
              onClick={() => setShowSettings(true)}
              className="mt-2 text-sm"
            >
              Click here to configure spaces.
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
