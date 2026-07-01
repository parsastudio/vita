import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPersianNumber(num: number | string): string {
  const value = typeof num === "string" ? parseFloat(num) : num;
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
