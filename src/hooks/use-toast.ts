import { useState, createContext, useContext, useCallback } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toasts: Toast[];
  toast: (message: string, type?: "success" | "error" | "info") => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined,
);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
