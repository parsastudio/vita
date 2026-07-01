"use client";

import React from "react";
import { formatPersianNumber } from "@/lib/utils";

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
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-vazir">
        مقایسه روند درآمد و هزینه‌های اخیر
      </h3>
      <div className="relative h-48 w-full flex items-end justify-between pt-6 gap-2">
        {trends.map((t, idx) => {
          const incH = (t.income / maxTrendVal) * 100;
          const expH = (t.expense / maxTrendVal) * 100;
          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end gap-2 group/trend"
            >
              <div className="w-full flex justify-center items-end gap-1.5 h-full">
                <div
                  style={{ height: `${Math.max(incH, 4)}%` }}
                  className="w-3 sm:w-5 bg-green-500 rounded-t-md transition-all duration-500 group-hover/trend:opacity-80"
                />
                <div
                  style={{ height: `${Math.max(expH, 4)}%` }}
                  className="w-3 sm:w-5 bg-red-500 rounded-t-md transition-all duration-500 group-hover/trend:opacity-80"
                />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground font-vazir mt-1">
                {t.label}
              </span>

              <div className="absolute bottom-16 bg-card border border-border p-2 rounded-lg shadow-xl opacity-0 group-hover/trend:opacity-100 transition-opacity pointer-events-none text-[10px] z-10 flex flex-col gap-1 font-vazir">
                <span className="text-green-600 font-bold">
                  درآمد: {formatPersianNumber(t.income)} تومان
                </span>
                <span className="text-red-600 font-bold">
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
