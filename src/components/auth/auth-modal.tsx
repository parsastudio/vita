"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { signUp, signIn } from "@/app/actions/auth";
import {
  requestPasswordResetAction,
  resetPasswordWithCodeAction,
} from "@/app/actions/auth-reset";

export function AuthModal() {
  const {
    showAuthModal,
    setShowAuthModal,
    isGuest,
    enableGuestMode,
    signIn: contextSignIn,
    signUp: contextSignUp,
    isLoading,
  } = useAuth();
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<
    "signin" | "signup" | "forgot_password" | "verify_reset"
  >("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showAuthModal && mounted) {
      document.body.style.overflow = "hidden";
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAuthModal, mounted]);

  useEffect(() => {
    if (!showAuthModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isGuest) {
        setShowAuthModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAuthModal, isGuest, setShowAuthModal]);

  if (!mounted || isLoading || !showAuthModal) return null;

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("لطفاً یک آدرس ایمیل معتبر وارد کنید.");
      return false;
    }
    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response =
        authMode === "signup"
          ? await contextSignUp(email, password)
          : await contextSignIn(email, password);

      if (response.success) {
        toast(
          authMode === "signup"
            ? "حساب کاربری با موفقیت ساخته شد!"
            : "ورود با موفقیت انجام شد!",
          "success",
        );
      } else if (response.error) {
        setError(response.error);
        toast(response.error, "error");
      }
    } catch {
      setError("یک خطای غیرمنتظره رخ داد. مجدداً تلاش کنید.");
      toast("احراز هویت با خطا مواجه شد.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("لطفاً یک آدرس ایمیل معتبر وارد کنید.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await requestPasswordResetAction(email);
      if (response.success) {
        toast("کد بازیابی به ایمیل شما ارسال شد", "success");
        setAuthMode("verify_reset");
      } else if (response.error) {
        setError(response.error);
        toast(response.error, "error");
      }
    } catch {
      setError("خطا در ارسال درخواست بازیابی.");
      toast("ارسال ایمیل با خطا مواجه شد.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (resetCode.length !== 6) {
      setError("کد بازیابی باید ۶ رقمی باشد.");
      return;
    }
    if (newPassword.length < 8) {
      setError("رمز عبور جدید باید حداقل ۸ کاراکتر باشد.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPasswordWithCodeAction(
        email,
        resetCode,
        newPassword,
      );
      if (response.success) {
        toast("رمز عبور با موفقیت تغییر کرد و وارد شدید", "success");
        setShowAuthModal(false);
      } else if (response.error) {
        setError(response.error);
        toast(response.error, "error");
      }
    } catch {
      setError("خطا در بازنشانی رمز عبور.");
      toast("عملیات با خطا مواجه شد.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/40 backdrop-blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          {isGuest && (
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 start-4 p-1 rounded-full hover:bg-muted text-muted-foreground transition-all cursor-pointer"
              aria-label="بستن"
            >
              <X className="size-4" />
            </button>
          )}

          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full overflow-hidden border border-border">
              <img
                src="/vita-logo.webp"
                alt="ویتا"
                className="size-full object-cover"
              />
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground font-vazir">
              خوش آمدید به ویتا
            </h2>
            <p className="mt-2 text-sm text-muted-foreground font-vazir">
              فضای شخصی هوشمند، غیرمتمرکز و آفلاین شما
            </p>
          </div>

          {error && (
            <div className="mt-6 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-medium text-center animate-shake font-vazir">
              {error}
            </div>
          )}

          {authMode === "signin" || authMode === "signup" ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-vazir">
                  آدرس ایمیل
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all disabled:opacity-50"
                  placeholder="name@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-vazir">
                    رمز عبور
                  </label>
                  {authMode === "signin" && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setError(null);
                        setAuthMode("forgot_password");
                      }}
                      className="text-xs text-primary hover:underline focus:outline-none cursor-pointer font-vazir"
                    >
                      فراموشی رمز عبور؟
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-6 font-vazir"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "در حال پردازش..."
                  : authMode === "signup"
                    ? "ایجاد حساب کاربری"
                    : "ورود به حساب"}
              </Button>
            </form>
          ) : authMode === "forgot_password" ? (
            <form onSubmit={handleRequestReset} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-vazir">
                  آدرس ایمیل خود را وارد کنید
                </label>
                <input
                  type="email"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all disabled:opacity-50"
                  placeholder="name@example.com"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-4 font-vazir"
                disabled={isSubmitting}
              >
                {isSubmitting ? "در حال ارسال..." : "ارسال کد بازیابی"}
              </Button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setError(null);
                  setAuthMode("signin");
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-vazir"
              >
                بازگشت به صفحه ورود
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyReset} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-vazir">
                  کد بازیابی ارسال شده (۶ رقمی)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  disabled={isSubmitting}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all disabled:opacity-50 tracking-widest text-center"
                  placeholder="123456"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-vazir">
                  رمز عبور جدید
                </label>
                <input
                  type="password"
                  required
                  disabled={isSubmitting}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-4 font-vazir"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "در حال به‌روزرسانی..."
                  : "تغییر رمز عبور و ورود"}
              </Button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setError(null);
                  setAuthMode("forgot_password");
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-vazir"
              >
                ارسال مجدد کد بازیابی
              </button>
            </form>
          )}

          {(authMode === "signin" || authMode === "signup") && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground font-vazir">
                    یا
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full font-vazir"
                  disabled={isSubmitting}
                  onClick={() => {
                    enableGuestMode();
                    toast("ورود به عنوان مهمان", "info");
                  }}
                >
                  ادامه به عنوان مهمان
                </Button>

                <button
                  disabled={isSubmitting}
                  onClick={() => {
                    setError(null);
                    setAuthMode(authMode === "signin" ? "signup" : "signin");
                  }}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer font-vazir"
                >
                  {authMode === "signup"
                    ? "قبلاً ثبت‌نام کرده‌اید؟ وارد شوید"
                    : "هنوز حسابی ندارید؟ ثبت‌نام کنید"}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
