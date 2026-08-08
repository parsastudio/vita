"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share, PlusSquare, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PwaInstallModal({ isOpen, onClose }: PwaInstallModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

          <div className="flex flex-col items-center text-center space-y-3">
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="size-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground font-vazir">
                نصب اپلیکیشن ویتا در آیفون / آیپد
              </h2>
              <p className="text-xs text-muted-foreground mt-1 font-vazir leading-relaxed">
                برای استفاده از تمامی قابلیت‌های آفلاین و دسترسی سریع بدون نیاز
                به مرورگر، مراحل زیر را طی کنید:
              </p>
            </div>
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
                  در منوی پایین مرورگر Safari روی آیکون اشتراک‌گذاری ضربه بزنید.
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
                  منو را به پایین اسکرول کرده و گزینه «افزودن به صفحه اصلی» را
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
