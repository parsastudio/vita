"use client";

import React, { useState, useEffect } from "react";
import { type FinanceTransaction } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPersianNumber, formatPersianDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useFinanceActions } from "@/hooks/use-finance-actions";
import { motion, AnimatePresence } from "framer-motion";

export function TransactionList({
  transactions,
}: {
  transactions: FinanceTransaction[];
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { user } = useAuth();
  const userId = user?.id || "guest";
  const { deleteTransaction } = useFinanceActions(userId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const filtered = sortedTransactions.filter((tx) => {
    const matchesSearch =
      tx.category.toLowerCase().includes(search.toLowerCase()) ||
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.tags.some((tag: string) =>
        tag.toLowerCase().includes(search.toLowerCase()),
      );

    if (filterType === "all") return matchesSearch;
    return matchesSearch && tx.type === filterType;
  });

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    toast("تراکنش با موفقیت حذف شد", "info");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در توضیحات، تگ‌ها و دسته‌بندی‌ها..."
          className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all font-vazir min-w-0"
        />

        <div className="flex flex-wrap gap-1.5">
          {[
            { key: "all", label: "همه" },
            { key: "expense", label: "هزینه‌ها" },
            { key: "income", label: "درآمدها" },
          ].map((filter) => (
            <Button
              key={filter.key}
              variant={filterType === filter.key ? "default" : "outline"}
              size="xs"
              onClick={() => setFilterType(filter.key)}
              className="font-vazir text-xs font-semibold"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pe-1">
        <AnimatePresence mode="popLayout">
          {filtered.map((tx) => (
            <motion.div
              layout
              key={tx.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="p-4 border border-border bg-background rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-muted-foreground/30 transition-all"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground break-words font-vazir">
                    {tx.category}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      tx.type === "income"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {tx.type === "income" ? "درآمد" : "هزینه"}
                  </span>
                </div>
                {tx.description && (
                  <p className="text-xs text-muted-foreground break-words font-vazir">
                    {tx.description}
                  </p>
                )}
                {tx.tags && tx.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tx.tags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[9px] bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary/90 border border-primary/10 dark:border-primary/20 px-1.5 py-0.5 rounded-sm font-vazir font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-[9px] text-muted-foreground block font-mono">
                  {mounted ? formatPersianDate(tx.createdAt) : "..."}
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/40 sm:border-transparent">
                <span
                  className={`font-bold text-sm ${
                    tx.type === "income"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {mounted
                    ? formatPersianNumber(Number(tx.amount))
                    : tx.amount}{" "}
                  تومان
                </span>

                <AnimatePresence mode="wait">
                  {confirmDeleteId === tx.id ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-1.5"
                    >
                      <span className="text-[10px] font-bold text-destructive font-vazir">
                        مطمئنید؟
                      </span>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => {
                          handleDelete(tx.id);
                          setConfirmDeleteId(null);
                        }}
                        className="h-6 px-2 text-[10px] font-bold font-vazir"
                      >
                        بله
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setConfirmDeleteId(null)}
                        className="h-6 px-2 text-[10px] font-bold font-vazir"
                      >
                        خیر
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div key="action">
                      <Button
                        variant="destructive"
                        size="icon-xs"
                        onClick={() => setConfirmDeleteId(tx.id)}
                        aria-label="حذف تراکنش"
                        className="hover:scale-105 active:scale-95 transition-transform"
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground font-vazir">
            هیچ تراکنشی یافت نشد.
          </div>
        )}
      </div>
    </div>
  );
}
