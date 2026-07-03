"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";

interface DashboardHeaderProps {
  isOnline: boolean;
  isGuest: boolean;
  isSyncing: boolean;
  performSync: () => void;
  user: { email: string } | null;
  logout: () => void;
  disableGuestMode: () => void;
  enabledModules: string[];
  toggleModule: (id: string) => void;
  theme: string;
  onToggleTheme: () => void;
  onOpenAccountSettings: () => void;
}

export function DashboardHeader({
  isOnline,
  isGuest,
  isSyncing,
  performSync,
  user,
  logout,
  enabledModules,
  toggleModule,
  theme,
  onToggleTheme,
  onOpenAccountSettings,
}: DashboardHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-6 gap-4 px-4 sm:px-0">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-vazir">
            ویتا
          </h1>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-[10px] font-semibold">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? "bg-green-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-muted-foreground uppercase">
              {isOnline ? "آنلاین" : "آفلاین"}
            </span>
          </div>

          {!isGuest && isOnline && (
            <button
              onClick={() => performSync()}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>
                {isSyncing ? "در حال همگام‌سازی..." : "همگام‌سازی ابر ✓"}
              </span>
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 font-vazir">
          فضای شخصی شما برای یادگیری و مدیریت هوشمند؛ متمرکز، امن و کاملاً
          آفلاین
        </p>
      </div>

      <div className="relative flex flex-wrap items-center gap-2.5 self-start md:self-auto">
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleTheme}
          className="rounded-full border-border bg-background text-foreground shrink-0"
        >
          <span className="sr-only">تغییر تم</span>
          {theme ? (
            theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )
          ) : (
            <Monitor className="size-4 text-muted animate-pulse" />
          )}
        </Button>

        {!isGuest && (
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="rounded-full size-8 p-0 flex items-center justify-center font-bold text-sm bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-all"
            >
              {user?.email?.[0]?.toUpperCase() || "U"}
            </Button>

            <AnimatePresence>
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute start-0 mt-2 w-56 bg-card border border-border rounded-xl p-4 shadow-xl z-20 space-y-3"
                  >
                    <div className="border-b border-border pb-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block font-vazir">
                        وارد شده با ایمیل
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate block mt-0.5 font-mono">
                        {user?.email}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAccountSettings();
                      }}
                      className="w-full text-start text-xs text-foreground hover:text-primary transition-colors py-1 block font-medium font-vazir"
                    >
                      تنظیمات حساب کاربری
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        performSync();
                      }}
                      className="w-full text-start text-xs text-foreground hover:text-primary transition-colors py-1 block font-medium font-vazir"
                    >
                      همگام‌سازی اجباری ابر
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-start text-xs text-destructive hover:text-destructive/80 transition-colors py-1 block font-semibold border-t border-border pt-2 font-vazir"
                    >
                      خروج از حساب
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        <Button
          variant="outline"
          onClick={() => setShowSettings(!showSettings)}
          className="rounded-full gap-2 text-sm font-vazir shrink-0"
        >
          تنظیمات فضاها
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
                className="absolute start-0 mt-2 w-72 bg-card border border-border rounded-xl p-5 shadow-xl z-20"
              >
                <h3 className="font-semibold text-sm text-foreground mb-4 font-vazir">
                  فعال‌سازی ماژول‌ها
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium font-vazir">
                        فضای یادگیری زبان
                      </span>
                      <span className="text-xs text-muted-foreground leading-relaxed font-vazir">
                        سیستم مرور لایتنر هوشمند
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
                      <span className="text-sm font-medium font-vazir">
                        فضای حسابداری هوشمند
                      </span>
                      <span className="text-xs text-muted-foreground leading-relaxed font-vazir">
                        مدیریت تراکنش‌ها و بودجه‌ها
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
  );
}
