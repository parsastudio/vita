"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function AuthModal() {
  const { showAuthModal, enableGuestMode, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showAuthModal) return null;

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
      const response = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (response.success) {
        toast(
          isSignUp
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-xl font-bold">و</span>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
              خوش آمدید به ویتا
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              فضای شخصی هوشمند، غیرمتمرکز و اول‌-آفلاین شما
            </p>
          </div>

          {error && (
            <div className="mt-6 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-medium text-center animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                آدرس ایمیل
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                رمز عبور
              </label>
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
              className="w-full mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "در حال پردازش..."
                : isSignUp
                  ? "ایجاد حساب کاربری"
                  : "ورود به حساب"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">یا</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
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
                setIsSignUp(!isSignUp);
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {isSignUp
                ? "قبلاً ثبت‌نام کرده‌اید؟ وارد شوید"
                : "هنوز حسابی ندارید؟ ثبت‌نام کنید"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
