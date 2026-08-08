"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share,
  PlusSquare,
  X,
  Sparkles,
  CheckCircle2,
  Monitor,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type PwaModalMode } from "@/hooks/use-pwa";

interface PwaInstallModalProps {
  mode: PwaModalMode;
  onClose: () => void;
}

export function PwaInstallModal({ mode, onClose }: PwaInstallModalProps) {
  useEffect(() => {
    if (!mode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, onClose]);

  if (!mode) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/60 backdrop-blur-3xl"
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
            aria-label="بستن"
          >
            <X className="size-4" />
          </button>

          {mode === "already_installed" && (
            <div className="space-y-5 text-center">
              <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-6 animate-pulse" />
              </div>
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-foreground font-vazir">
                  اپلیکیشن ویتا روی سیستم شما نصب است
                </h2>
                <div className="p-3.5 bg-primary/5 border border-primary/15 rounded-xl space-y-1.5 text-right font-vazir">
                  <span className="text-xs font-bold text-primary block flex items-center gap-1.5">
                    <ExternalLink className="size-3.5" />
                    روش باز کردن اپلیکیشن:
                  </span>
                  <span className="text-[11px] text-muted-foreground block leading-relaxed">
                    در بالای همین صفحه (سمت راست نوار آدرس مرورگر)، روی آیکون 💻
                    یا ↗️ کلیک کنید یا برنامه را از منوی سیستم خود اجرا کنید.
                  </span>
                </div>
              </div>
              <Button
                onClick={onClose}
                className="w-full font-vazir text-xs h-10 font-bold"
              >
                متوجه شدم
              </Button>
            </div>
          )}

          {mode === "ios" && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="size-6 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-foreground font-vazir">
                  نصب اپلیکیشن ویتا در آیفون / آیپد
                </h2>
                <p className="text-xs text-muted-foreground font-vazir leading-relaxed">
                  جهت دسترسی سریع و استفاده آفلاین، مراحل زیر را اجرا کنید:
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Share className="size-4" />
                  </div>
                  <div className="space-y-0.5 text-right font-vazir">
                    <span className="text-xs font-bold text-foreground block">
                      ۱. آیکون Share (اشتراک‌گذاری)
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      در منوی پایین مرورگر Safari روی آیکون اشتراک‌گذاری کلیک
                      کنید.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <PlusSquare className="size-4" />
                  </div>
                  <div className="space-y-0.5 text-right font-vazir">
                    <span className="text-xs font-bold text-foreground block">
                      ۲. گزینه‌ی Add to Home Screen
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      منو را به پایین اسکرول کرده و «افزودن به صفحه اصلی» را
                      بزنید.
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={onClose}
                className="w-full font-vazir text-xs h-10 font-bold"
              >
                متوجه شدم
              </Button>
            </div>
          )}

          {mode === "desktop_guide" && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Monitor className="size-6 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-foreground font-vazir">
                  راهنمای نصب اپلیکیشن ویتا
                </h2>
                <p className="text-xs text-muted-foreground font-vazir leading-relaxed">
                  می‌توانید اپلیکیشن را مستقیماً از نوار مرورگر خود نصب کنید:
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <PlusSquare className="size-4" />
                  </div>
                  <div className="space-y-0.5 text-right font-vazir">
                    <span className="text-xs font-bold text-foreground block">
                      آیکون نصب در نوار آدرس (Address Bar)
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      در بالای مرورگر (سمت راست آدرس سایت)، روی آیکون ➕ یا 💻
                      برای نصب کلیک کنید.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Monitor className="size-4" />
                  </div>
                  <div className="space-y-0.5 text-right font-vazir">
                    <span className="text-xs font-bold text-foreground block">
                      منوی سه نقطه مرورگر (⋮)
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      یا از منوی مرورگر گزینه «نصب ویتا» (Install Vita) را
                      انتخاب کنید.
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={onClose}
                className="w-full font-vazir text-xs h-10 font-bold"
              >
                متوجه شدم
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
