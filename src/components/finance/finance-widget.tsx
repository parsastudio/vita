"use client";

import React, { useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";
import { QuickEntry } from "./quick-entry";
import { TransactionList } from "./transaction-list";
import { Button } from "@/components/ui/button";
import { formatPersianNumber } from "@/lib/utils";
import dynamic from "next/dynamic";

const FinanceDashboard = dynamic(
  () => import("./finance-dashboard").then((mod) => mod.FinanceDashboard),
  {
    loading: () => (
      <div className="h-96 bg-muted/20 rounded-2xl animate-pulse flex items-center justify-center text-xs text-muted-foreground font-vazir">
        در حال بارگذاری داشبورد مالی...
      </div>
    ),
    ssr: false,
  },
);

export function FinanceWidget() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab =
    (searchParams.get("tab") as "add" | "stats" | "list") || "add";

  const setActiveTab = (tab: "add" | "stats" | "list") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const userId = user?.id || "guest";

  const transactions = useLiveQuery(() => {
    return localDb.financeTransactions.where("userId").equals(userId).toArray();
  }, [userId]);

  const budgets = useLiveQuery(() => {
    return localDb.financeBudgets.where("userId").equals(userId).toArray();
  }, [userId]);

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
          {formatPersianNumber(txCount)} تراکنش
        </span>
      </div>

      <div className="flex gap-1.5 border-b border-border pb-3">
        <Button
          variant={activeTab === "add" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("add")}
          className="font-vazir text-xs font-semibold"
        >
          ثبت سریع تراکنش
        </Button>

        <Button
          variant={activeTab === "stats" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("stats")}
          className="font-vazir text-xs font-semibold"
        >
          تحلیل و بودجه‌بندی
        </Button>

        <Button
          variant={activeTab === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("list")}
          className="font-vazir text-xs font-semibold"
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
            userId={userId}
          />
        )}

        {activeTab === "list" && (
          <TransactionList transactions={transactions || []} />
        )}
      </div>
    </div>
  );
}
