import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPersianNumber(num: number | string): string {
  const cleanNum = typeof num === "string" ? num.replace(/,/g, "") : num;
  const value = typeof cleanNum === "string" ? parseFloat(cleanNum) : cleanNum;
  if (isNaN(value)) return "۰";
  return new Intl.NumberFormat("fa-IR").format(value);
}

export function formatPersianDate(date: Date | string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function getJalaliDateParts(date: Date | string | number): {
  year: number;
  month: number;
  day: number;
  monthName: string;
} {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "0", 10);
  const month =
    parseInt(parts.find((p) => p.type === "month")?.value || "0", 10) - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "0", 10);
  const monthNames = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];
  const monthName = monthNames[month] || "";
  return { year, month, day, monthName };
}
