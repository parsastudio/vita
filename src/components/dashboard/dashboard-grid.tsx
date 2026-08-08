"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardState } from "@/components/dashboard/use-dashboard-state";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BookOpen, Wallet } from "lucide-react";
import { LogoutModal } from "@/components/auth/logout-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import { AccountSettingsModal } from "@/components/auth/account-settings-modal";
import { usePwa } from "@/hooks/use-pwa";
import { useToast } from "@/hooks/use-toast";
import { PwaInstallModal } from "@/components/pwa/pwa-install-modal";

export function DashboardGrid({
  languageWidget,
  financeWidget,
}: {
  languageWidget: React.ReactNode;
  financeWidget: React.ReactNode;
}) {
  const {
    user,
    isGuest,
    isLoading,
    enabledModules,
    toggleModule,
    isSyncing,
    performSync,
    isOnline,
    activeWidget,
    setActiveWidget,
    logout,
    theme,
    handleToggleTheme,
    showAccountSettings,
    setShowAccountSettings,
  } = useDashboardState();

  const { isStandalone, showIosModal, setShowIosModal, handleInstallClick } =
    usePwa();
  const { toast } = useToast();

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

  const onInstallApp = async () => {
    const outcome = await handleInstallClick();
    if (outcome === "already_installed") {
      toast("شما در حال حاضر از نسخه نصب‌شده اپلیکیشن استفاده می‌کنید", "info");
    } else if (outcome === "unsupported") {
      toast(
        "مرورگر شما از نصب مستقیم پشتیبانی نمی‌کند. لطفاً با Chrome یا Safari وارد شوید",
        "info",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-8 animate-pulse">
        <div className="h-20 bg-muted/50 rounded-2xl w-full" />
        <div className="h-96 bg-muted/40 rounded-2xl w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-0 sm:px-4 pt-8 pb-16 md:pt-12 md:pb-24 flex flex-col gap-8">
      <ErrorBoundary
        fallback={
          <div className="px-4 sm:px-0 p-4 border border-destructive/20 bg-destructive/5 text-destructive rounded-xl text-center font-vazir text-xs">
            خطایی در لود بخش بالای داشبورد رخ داد.
          </div>
        }
      >
        <DashboardHeader
          isOnline={isOnline}
          isGuest={isGuest}
          isSyncing={isSyncing}
          performSync={performSync}
          user={user}
          logout={logout}
          enabledModules={enabledModules}
          toggleModule={toggleModule}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenAccountSettings={() => setShowAccountSettings(true)}
        />
      </ErrorBoundary>

      {enabledModules.length > 0 && (
        <div className="w-full flex justify-center border-b border-border pb-1 px-4 sm:px-0">
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
              className="px-4 w-full"
            >
              <div className="w-full flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-2xl">
                <p className="text-muted-foreground font-vazir">
                  تمامی فضاهای کاربری غیرفعال هستند.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full mt-8 pt-8 border-t border-border/40 text-center space-y-4 px-4 sm:px-0">
        {!isStandalone ? (
          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/80 font-vazir bg-primary/5 border border-primary/10 rounded-lg py-1.5 px-3.5 max-w-xs mx-auto transition-all hover:bg-primary/10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <button
              onClick={onInstallApp}
              className="font-bold text-primary hover:underline cursor-pointer"
            >
              دانلود و نصب اپلیکیشن ویتا
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-vazir bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-1.5 px-3.5 max-w-xs mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">نسخه نصب‌شده اپلیکیشن (فعال)</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground/80 font-vazir leading-relaxed">
          تمامی حقوق مادی و معنوی این پلتفرم محفوظ و داده‌ها به‌طور امن بر روی
          دستگاه شما کپسوله شده‌اند.
        </p>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60 font-vazir">
          <span>نسخه ۲.۰.۰</span>
          <span>•</span>
          <span>طراحی شده برای بهره‌وری برتر</span>
        </div>
      </footer>

      <ErrorBoundary
        fallback={
          <div className="p-4 border border-destructive/20 bg-destructive/5 text-destructive rounded-xl text-center font-vazir text-xs">
            خطایی در اجرای بخش خروج رخ داد.
          </div>
        }
      >
        <LogoutModal />
      </ErrorBoundary>

      <ErrorBoundary
        fallback={
          <div className="p-4 border border-destructive/20 bg-destructive/5 text-destructive rounded-xl text-center font-vazir text-xs">
            خطایی در اجرای بخش تنظیمات حساب کاربری رخ داد.
          </div>
        }
      >
        <AccountSettingsModal
          isOpen={showAccountSettings}
          onClose={() => setShowAccountSettings(false)}
          userEmail={user?.email || ""}
        />
      </ErrorBoundary>

      <PwaInstallModal
        isOpen={showIosModal}
        onClose={() => setShowIosModal(false)}
      />
    </div>
  );
}
