"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useDashboardState } from "./use-dashboard-state";
import { Button } from "@/components/ui/button";
import { Monitor, Moon, Sun, BookOpen, Wallet } from "lucide-react";
import { LogoutModal } from "@/components/auth/logout-modal";
import { ErrorBoundary } from "@/components/error-boundary";

export function DashboardGrid({
  languageWidget,
  financeWidget,
}: {
  languageWidget: React.ReactNode;
  financeWidget: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const {
    user,
    isGuest,
    isLoading,
    enabledModules,
    isSyncing,
    performSync,
    showSettings,
    setShowSettings,
    showUserMenu,
    setShowUserMenu,
    isOnline,
    mounted,
    activeWidget,
    setActiveWidget,
    logout,
  } = useDashboardState();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isLanguageEnabled = enabledModules.includes("language");
  const isFinanceEnabled = enabledModules.includes("finance");

  React.useEffect(() => {
    if (isLanguageEnabled && !isFinanceEnabled && activeWidget !== "language") {
      setActiveWidget("language");
    } else if (
      isFinanceEnabled &&
      !isLanguageEnabled &&
      activeWidget !== "finance"
    ) {
      setActiveWidget("finance");
    }
  }, [isLanguageEnabled, isFinanceEnabled, activeWidget, setActiveWidget]);

  if (isLoading) {
    return (
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-8 animate-pulse">
        <div className="h-20 bg-muted/50 rounded-2xl w-full" />
        <div className="h-96 bg-muted/40 rounded-2xl w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-vazir">
              ویتا اسپیس
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

            {isGuest && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <span>ذخیره محلی (IndexedDB)</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-vazir">
            فضای شخصی و امن شما، فعال به صورت آفلاین به طور پیش‌فرض
          </p>
        </div>

        <div className="relative flex items-center gap-3 self-start md:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full border-border bg-background text-foreground"
          >
            <span className="sr-only">تغییر تم</span>
            {mounted ? (
              theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )
            ) : (
              <Monitor className="size-4 text-muted animate-pulse" />
            )}
          </Button>

          {isGuest ? (
            <Button
              variant="default"
              onClick={performSync}
              className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-none text-xs px-4 h-8 font-semibold shadow-md shadow-indigo-500/20 animate-pulse font-vazir"
            >
              ذخیره ابری پیشرفت‌ها
            </Button>
          ) : (
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
            className="rounded-full gap-2 text-sm font-vazir"
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

      {enabledModules.length > 0 && (
        <div className="w-full flex justify-center border-b border-border pb-1">
          <div className="relative flex p-1 bg-muted rounded-xl w-full max-w-md">
            {isLanguageEnabled && (
              <button
                onClick={() => setActiveWidget("language")}
                className={`relative flex-1 py-2 text-xs font-bold font-vazir rounded-lg transition-colors flex items-center justify-center gap-2 z-10 cursor-pointer ${
                  activeWidget === "language"
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {activeWidget === "language" && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-primary rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <BookOpen className="size-4" />
                یادگیری زبان
              </button>
            )}

            {isFinanceEnabled && (
              <button
                onClick={() => setActiveWidget("finance")}
                className={`relative flex-1 py-2 text-xs font-bold font-vazir rounded-lg transition-colors flex items-center justify-center gap-2 z-10 cursor-pointer ${
                  activeWidget === "finance"
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {activeWidget === "finance" && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-primary rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Wallet className="size-4" />
                حسابداری شخصی
              </button>
            )}
          </div>
        </div>
      )}

      <main className="w-full flex flex-col gap-8 items-start">
        <AnimatePresence mode="wait">
          {activeWidget === "language" && isLanguageEnabled && (
            <motion.div
              key="language-pane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <ErrorBoundary
                fallback={
                  <div className="p-6 border border-destructive/20 bg-destructive/5 text-destructive rounded-2xl text-center font-vazir text-xs">
                    خطایی در اجرای فضای یادگیری زبان رخ داده است.
                  </div>
                }
              >
                {languageWidget}
              </ErrorBoundary>
            </motion.div>
          )}

          {activeWidget === "finance" && isFinanceEnabled && (
            <motion.div
              key="finance-pane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <ErrorBoundary
                fallback={
                  <div className="p-6 border border-destructive/20 bg-destructive/5 text-destructive rounded-2xl text-center font-vazir text-xs">
                    خطایی در اجرای فضای حسابداری هوشمند رخ داده است.
                  </div>
                }
              >
                {financeWidget}
              </ErrorBoundary>
            </motion.div>
          )}

          {enabledModules.length === 0 && (
            <motion.div
              key="empty-pane"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-2xl"
            >
              <p className="text-muted-foreground font-vazir">
                تمامی فضاهای کاربری غیرفعال هستند.
              </p>
              <Button
                variant="link"
                onClick={() => setShowSettings(true)}
                className="mt-2 text-sm font-vazir"
              >
                پیکربندی و فعال‌سازی فضاها
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <LogoutModal />
    </div>
  );
}
