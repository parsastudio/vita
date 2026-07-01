"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";

export function LogoutModal() {
  const { showLogoutModal, setShowLogoutModal, confirmLogout } = useAuth();

  if (!showLogoutModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowLogoutModal(false)}
          className="absolute inset-0 bg-background/40 backdrop-blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6"
        >
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-bold text-foreground font-vazir">
              داده‌های همگام‌سازی‌نشده موجود است
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed font-vazir">
              تغییراتی روی مرورگر شما وجود دارد که هنوز با سرور ابری همگام‌سازی
              نشده‌اند. در صورت خروج از حساب کاربری، تمامی این اطلاعات برای
              همیشه حذف خواهند شد. آیا همچنان مایل به خروج هستید؟
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowLogoutModal(false)}
              className="flex-1 font-vazir text-xs h-9"
            >
              لغو و بازگشت
            </Button>
            <Button
              variant="destructive"
              onClick={confirmLogout}
              className="flex-1 font-vazir text-xs h-9"
            >
              خروج و حذف اطلاعات
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
