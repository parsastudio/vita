"use client";

import React, { useState, useEffect } from "react";
import { useSrsSettings } from "@/hooks/use-srs-settings";
import { useLanguageActions } from "@/hooks/use-language-actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Brain, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import { formatPersianNumber } from "@/lib/utils";

export function SrsSettings() {
  const { dailyNewWordsLimit, todayNewWordsCount, updateDailyLimit, userId } =
    useSrsSettings();
  const { reconcileLanguageQueue } = useLanguageActions();
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState(dailyNewWordsLimit.toString());
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setInputValue(dailyNewWordsLimit.toString());
  }, [dailyNewWordsLimit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseInt(inputValue, 10);
    if (isNaN(limit) || limit < 1 || limit > 50) {
      toast("لطفاً عددی معتبر بین ۱ تا ۵۰ وارد کنید", "error");
      return;
    }

    setIsUpdating(true);
    await updateDailyLimit(limit);
    await reconcileLanguageQueue(userId);
    setIsUpdating(false);
    toast("تنظیمات یادگیری روزانه شما با موفقیت به‌روزرسانی شد", "success");
  };

  const handleSyncQueue = async () => {
    setIsUpdating(true);
    await reconcileLanguageQueue(userId);
    setIsUpdating(false);
    toast("صف انتظار لایتنر با موفقیت تحلیل و همگام شد", "success");
  };

  const limitNum = parseInt(inputValue, 10) || dailyNewWordsLimit;

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-violet-500/5 to-indigo-500/5 border border-primary/10">
        <h3 className="text-sm font-bold text-foreground font-vazir flex items-center gap-2">
          <Brain className="size-4 text-primary animate-pulse" />
          تنظیمات بهینه‌سازی ظرفیت حافظه
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          فرآیند کپسوله‌سازی و انتقال کلمات جدید از صف انتظار به چرخه مرور فعال
          را بر اساس فرکانس و بازدهی سیستم تحلیل شناختی شخصی‌سازی کنید.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground font-vazir">
              محدودیت یادگیری کلمات جدید در روز
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir"
            />
          </div>

          <div className="p-3 border border-border bg-muted/20 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground font-vazir block">
              وضعیت یادگیری امروز
            </span>
            <p className="text-sm font-bold text-foreground font-vazir">
              {formatPersianNumber(todayNewWordsCount)} از{" "}
              {formatPersianNumber(dailyNewWordsLimit)} کلمه جدید روزانه فعال
              شده است.
            </p>
          </div>
        </div>

        {limitNum > 10 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs leading-relaxed font-vazir flex items-start gap-2 animate-in fade-in duration-300">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">توصیه علوم شناختی:</span>
              <p>
                دانشمندان حوزه یادگیری زبان معتقدند مغز انسان روزانه ظرفیت بهینه
                برای هضم ۵ الی ۱۰ کلمه جدید در حافظه فعال را دارد. افزایش این
                رقم ممکن است نرخ فراموشی را تا ۴ برابر افزایش دهد و به مرور
                خسته‌کننده شود.
              </p>
            </div>
          </div>
        )}

        {limitNum <= 10 && limitNum >= 5 && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs leading-relaxed font-vazir flex items-start gap-2 animate-in fade-in duration-300">
            <Sparkles className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">
                بودجه کلماتی بسیار مناسب و هوشمندانه:
              </span>
              <p>
                محدوده انتخاب‌شده شما کاملاً با چرخه انطباق حافظه بلندمدت
                همخوانی دارد. این موضوع پایداری فرآیند مطالعه شما را به حداکثر
                می‌رساند.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="submit"
            disabled={isUpdating}
            className="flex-1 font-vazir h-10 text-xs font-bold"
          >
            {isUpdating ? "در حال ذخیره‌سازی..." : "ذخیره تنظیمات عددی"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleSyncQueue}
            disabled={isUpdating}
            className="font-vazir h-10 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            بررسی مجدد و همگام‌سازی فوری صف
          </Button>
        </div>
      </form>
    </div>
  );
}
