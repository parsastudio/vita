"use client";

import React from "react";
import { formatPersianNumber } from "@/lib/utils";
import { motion } from "framer-motion";

interface Trend {
  income: number;
  expense: number;
  label: string;
}

interface TrendChartProps {
  trends: Trend[];
  maxTrendVal: number;
}

export function TrendChart({ trends, maxTrendVal }: TrendChartProps) {
  return (
    <div className="p-6 border border-border bg-background rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-vazir">
          مقایسه روند درآمد و هزینه‌های اخیر
        </h3>
        <div className="flex items-center gap-3 text-[10px] font-bold font-vazir">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground">درآمد</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-muted-foreground">هزینه</span>
          </div>
        </div>
      </div>
      <div className="relative h-48 w-full flex items-end justify-between pt-6 gap-2 border-b border-border">
        {trends.map((t, idx) => {
          const incH = (t.income / maxTrendVal) * 100;
          const expH = (t.expense / maxTrendVal) * 100;
          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end gap-2 group/trend"
            >
              <div className="w-full flex justify-center items-end gap-1.5 h-full">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(incH, 4)}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 80,
                    damping: 15,
                    delay: idx * 0.05,
                  }}
                  className="w-3 sm:w-5 bg-emerald-500 rounded-t-sm group-hover/trend:opacity-80 transition-opacity"
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(expH, 4)}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 80,
                    damping: 15,
                    delay: idx * 0.05 + 0.02,
                  }}
                  className="w-3 sm:w-5 bg-rose-500 rounded-t-sm group-hover/trend:opacity-80 transition-opacity"
                />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground font-vazir mt-1">
                {t.label}
              </span>

              <div className="absolute bottom-16 bg-card border border-border p-3 rounded-lg shadow-xl opacity-0 group-hover/trend:opacity-100 transition-opacity duration-200 pointer-events-none text-[10px] z-10 flex flex-col gap-1.5 font-vazir">
                <span className="text-foreground font-bold border-b border-border pb-1 mb-1 block">
                  تحلیل ماه {t.label}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  درآمد: {formatPersianNumber(t.income)} تومان
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  هزینه: {formatPersianNumber(t.expense)} تومان
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
