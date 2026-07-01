"use client";

import React, { useState, useEffect } from "react";
import { localDb, type FinanceTransaction } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatPersianNumber, formatPersianDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export function TransactionList({
  transactions,
}: {
  transactions: FinanceTransaction[];
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = transactions.filter((tx) => {
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
    await localDb.transaction(
      "rw",
      [localDb.financeTransactions, localDb.deletedRecords],
      async () => {
        await localDb.financeTransactions.delete(id);
        await localDb.deletedRecords.put({
          id,
          tableName: "financeTransactions",
          deletedAt: new Date(),
          synced: false,
        });
      },
    );
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
          className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
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
              className="font-vazir text-xs"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pe-1">
        {filtered.map((tx) => (
          <div
            key={tx.id}
            className="p-4 border border-border bg-background rounded-xl flex items-center justify-between gap-4 hover:border-muted-foreground/30 transition-all animate-in fade-in duration-300"
          >
            <div className="space-y-1 flex-1 min-w-0">
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
                      className="text-[9px] bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground font-vazir"
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

            <div className="flex items-center gap-3 shrink-0">
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
              <Button
                variant="destructive"
                size="icon-xs"
                onClick={() => handleDelete(tx.id)}
                aria-label="حذف تراکنش"
                className="hover:scale-105 transition-transform"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground font-vazir">
            هیچ تراکنشی یافت نشد.
          </div>
        )}
      </div>
    </div>
  );
}
