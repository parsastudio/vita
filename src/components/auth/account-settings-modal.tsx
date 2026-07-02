"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateAccountAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function AccountSettingsModal({
  isOpen,
  onClose,
  userEmail,
}: AccountSettingsModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState(userEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await updateAccountAction(email);
      if (response.success) {
        toast("ایمیل با موفقیت به‌روزرسانی شد", "success");
        onClose();
      } else if (response.error) {
        setError(response.error);
        toast(response.error, "error");
      }
    } catch {
      setError("خطا در به‌روزرسانی اطلاعات");
      toast("بروز خطای غیرمنتظره", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("تکرار رمز عبور جدید همخوانی ندارد");
      return;
    }

    setIsLoading(true);

    try {
      const response = await updateAccountAction(
        undefined,
        currentPassword,
        newPassword,
      );
      if (response.success) {
        toast("رمز عبور با موفقیت تغییر کرد", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onClose();
      } else if (response.error) {
        setError(response.error);
        toast(response.error, "error");
      }
    } catch {
      setError("خطا در تغییر رمز عبور");
      toast("بروز خطای غیرمنتظره", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/40 backdrop-blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6"
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={onClose}
            className="absolute top-4 start-4 p-1 rounded-full hover:bg-muted text-muted-foreground transition-all cursor-pointer"
          >
            <X className="size-4" />
          </button>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground font-vazir">
              تنظیمات حساب کاربری
            </h2>
            <p className="text-xs text-muted-foreground font-vazir">
              اطلاعات امنیتی و ایمیل حساب خود را مدیریت کنید
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-medium text-center font-vazir">
              {error}
            </div>
          )}

          <div className="space-y-6 divide-y divide-border">
            <form onSubmit={handleUpdateEmail} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-vazir">
                  آدرس ایمیل
                </label>
                <input
                  type="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all disabled:opacity-50 font-vazir"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full font-vazir"
                disabled={isLoading}
              >
                به‌روزرسانی ایمیل
              </Button>
            </form>

            <form onSubmit={handleUpdatePassword} className="space-y-3 pt-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-vazir">
                  رمز عبور فعلی
                </label>
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-vazir">
                  رمز عبور جدید
                </label>
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-vazir">
                  تکرار رمز عبور جدید
                </label>
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                size="sm"
                className="w-full font-vazir"
                disabled={isLoading}
              >
                تغییر رمز عبور
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
