"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { QuickEntry } from "./quick-entry";
import { FinanceDashboard } from "./finance-dashboard";
import { TransactionList } from "./transaction-list";
import { Button } from "@/components/ui/button";

export function FinanceWidget() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"add" | "stats" | "list">("add");

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
            Smart Finance
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Decentralized transaction tracking & budget compliance
          </p>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {txCount} Trans
        </span>
      </div>

      <div className="flex gap-1.5 border-b border-border pb-3">
        <Button
          variant={activeTab === "add" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("add")}
        >
          Add Record
        </Button>

        <Button
          variant={activeTab === "stats" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("stats")}
        >
          Insights
        </Button>

        <Button
          variant={activeTab === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("list")}
        >
          Ledger
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
