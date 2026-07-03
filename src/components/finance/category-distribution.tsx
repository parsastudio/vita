"use client";

import React, { useState, useMemo } from "react";
import { formatPersianNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PieChart, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CategorySegment {
  name: string;
  value: number;
  percentage: number;
  color: string;
  strokeDashoffset: number;
  strokeDasharray: string;
}

interface CategoryDistributionProps {
  categories: Array<{ name: string; value: number; percentage: number }>;
  totalExpense: number;
  onExportCSV: () => void;
  mounted: boolean;
}

export function CategoryDistribution({
  categories,
  totalExpense,
  onExportCSV,
  mounted,
}: CategoryDistributionProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const segments = useMemo<CategorySegment[]>(() => {
    let accumulatedPercent = 0;
    const colors = [
      "#8B5CF6",
      "#10B981",
      "#3B82F6",
      "#F59E0B",
      "#EF4444",
      "#EC4899",
      "#6B7280",
    ];
    return categories.map((cat, idx) => {
      const currentPercent = cat.percentage;
      const strokeDashoffset = 100 - accumulatedPercent;
      accumulatedPercent += currentPercent;
      return {
        ...cat,
        color: colors[idx % colors.length],
        strokeDashoffset,
        strokeDasharray: `${currentPercent} ${100 - currentPercent}`,
      };
    });
  }, [categories]);

  return (
    <div className="p-6 border border-border bg-background rounded-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-vazir">
            سهم عنوان هزینه‌ها
          </h3>
        </div>
        <Button
          variant="outline"
          size="xs"
          onClick={onExportCSV}
          className="font-vazir text-xs flex items-center gap-1.5"
        >
          <Download className="size-3.5" />
          خروجی اکسل
        </Button>
      </div>

      {categories.length > 0 ? (
        <div className="flex flex-col md:flex-row items-center gap-12 justify-center py-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
            className="relative w-44 h-44 shrink-0"
          >
            <svg
              viewBox="0 0 36 36"
              className="w-full h-full transform -rotate-90"
            >
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="transparent"
                strokeWidth="3"
              />
              {segments.map((seg, idx) => (
                <motion.circle
                  key={idx}
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hoveredIdx === idx ? "4.5" : "3.2"}
                  strokeDasharray={seg.strokeDasharray}
                  initial={{ strokeDashoffset: 100 }}
                  animate={{ strokeDashoffset: seg.strokeDashoffset }}
                  transition={{
                    type: "spring",
                    stiffness: 60,
                    damping: 14,
                    delay: idx * 0.05,
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="transition-all duration-200 ease-out cursor-pointer"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1 pointer-events-none">
              <AnimatePresence mode="wait">
                {hoveredIdx !== null ? (
                  <motion.div
                    key="hovered"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-[10px] text-muted-foreground truncate max-w-[90px] font-bold font-vazir">
                      {segments[hoveredIdx].name}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {formatPersianNumber(
                        segments[hoveredIdx].percentage.toFixed(0),
                      )}
                      %
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="total"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-[10px] text-muted-foreground uppercase font-bold font-vazir">
                      کل مخارج
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {mounted
                        ? formatPersianNumber(totalExpense)
                        : totalExpense}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <div className="flex-1 w-full space-y-3">
            {segments.map((seg, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex flex-col gap-1.5 p-2 rounded-lg transition-colors duration-200 ${
                  hoveredIdx === idx ? "bg-muted/50" : ""
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="font-semibold text-foreground font-vazir">
                      {seg.name}
                    </span>
                  </div>
                  <div className="text-start text-muted-foreground font-vazir">
                    <span className="font-bold text-foreground">
                      {mounted ? formatPersianNumber(seg.value) : seg.value}{" "}
                      تومان
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${seg.percentage}%` }}
                    transition={{
                      type: "spring",
                      stiffness: 50,
                      damping: 15,
                      delay: idx * 0.05,
                    }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: seg.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-sm text-muted-foreground font-vazir">
          هنوز هزینه‌ای ثبت نشده است تا سهم عنوان رندر شود.
        </div>
      )}
    </div>
  );
}
