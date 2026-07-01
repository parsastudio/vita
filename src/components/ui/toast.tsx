"use client";

import React, { useState, useCallback } from "react";
import { Toast, ToastContext } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => {
        const next = [...prev, { id, message, type }];
        if (next.length > 3) {
          return next.slice(-3);
        }
        return next;
      });
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-6 start-6 z-[100] flex flex-col gap-2 max-w-md w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-xl flex items-center justify-between border backdrop-blur-md ${
                t.type === "success"
                  ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                  : t.type === "error"
                    ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                    : "bg-primary/10 border-primary/20 text-primary"
              }`}
            >
              <span className="text-xs font-semibold">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-xs font-bold hover:opacity-75 transition-opacity ms-4 cursor-pointer"
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
