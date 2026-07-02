"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/client";
import { useAuth } from "@/lib/auth/auth-context";

export function useFinanceData() {
  const { user } = useAuth();
  const userId = user?.id || "guest";

  const transactions = useLiveQuery(() => {
    return localDb.financeTransactions.where("userId").equals(userId).toArray();
  }, [userId]);

  const budgets = useLiveQuery(() => {
    return localDb.financeBudgets.where("userId").equals(userId).toArray();
  }, [userId]);

  const txCount = transactions?.length || 0;

  return {
    transactions: transactions || [],
    budgets: budgets || [],
    txCount,
    userId,
  };
}
