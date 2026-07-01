"use client";

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { QuickEntry } from "./quick-entry";
import { FinanceDashboard } from "./finance-dashboard";
import { TransactionList } from "./transaction-list";
import { Button } from "@/components/ui/button";
import { formatPersianNumber } from "@/lib/utils";

export function FinanceWidget() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"add" | "stats" | "list">("add");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const transactions = useLiveQuery(() => {
    const userId = user?.id || "guest";
    return localDb.financeTransactions.where("userId").equals(userId).toArray();
  }, [user]);

  const budgets = useLiveQuery(() => {
    const userId = user?.id || "guest";
    return localDb.financeBudgets.where("userId").equals(userId).toArray();
  }, [user]);

  const txCount = transactions?.length || 0;

  return (
    <div className="border border-border bg-card rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-vazir text-foreground">
            حسابداری شخصی هوشمند
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ردیابی غیرمتمرکز تراکنش‌ها و مدیریت بودجه ماهانه
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold">
          {mounted ? formatPersianNumber(txCount) : txCount} تراکنش
        </span>
      </div>

      <div className="flex gap-1.5 border-b border-border pb-3">
        <Button
          variant={activeTab === "add" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("add")}
          className="font-vazir text-xs"
        >
          ثبت سریع تراکنش
        </Button>

        <Button
          variant={activeTab === "stats" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("stats")}
          className="font-vazir text-xs"
        >
          تحلیل و بودجه‌بندی
        </Button>

        <Button
          variant={activeTab === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("list")}
          className="font-vazir text-xs"
        >
          دفتر کل معاملات
        </Button>
      </div>

      <div className="flex-1">
        {activeTab === "add" && (
          <QuickEntry
            transactions={transactions || []}
            onSaveSuccess={() => setActiveTab("list")}
          />
        )}

        {activeTab === "stats" && (
          <FinanceDashboard
            transactions={transactions || []}
            budgets={budgets || []}
          />
        )}

        {activeTab === "list" && (
          <TransactionList transactions={transactions || []} />
        )}
      </div>
    </div>
  );
}
