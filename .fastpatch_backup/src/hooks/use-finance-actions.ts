"use client";

import { localDb, type FinanceTransaction } from "@/lib/db/client";
import { getJalaliDateParts, formatPersianNumber } from "@/lib/utils";
import { toEnglishDigits } from "@/lib/nlp";
import { v4 as uuidv4 } from "uuid";

interface ParsedNlp {
  amount: number;
  type: "income" | "expense";
  category: string;
  tags: string[];
  description: string;
}

interface PresetQuick {
  label: string;
  amount: number;
  type: "income" | "expense";
  category: string;
}

export function useFinanceActions(userId: string) {
  const saveManualTransaction = async (
    amountNum: number,
    type: "income" | "expense",
    category: string,
    tags: string[],
    description: string,
  ) => {
    await localDb.transaction("rw", [localDb.financeTransactions], async () => {
      await localDb.financeTransactions.put({
        id: uuidv4(),
        userId,
        amount: amountNum,
        type,
        category: category.trim(),
        tags: tags.length > 0 ? tags : [category.trim()],
        description: description.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      });
    });
  };

  const saveDirectTransaction = async (parsed: ParsedNlp) => {
    await localDb.transaction("rw", [localDb.financeTransactions], async () => {
      await localDb.financeTransactions.put({
        id: uuidv4(),
        userId,
        amount: parsed.amount,
        type: parsed.type,
        category: parsed.category,
        tags: parsed.tags,
        description: parsed.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      });
    });
  };

  const savePresetTransaction = async (preset: PresetQuick) => {
    await localDb.transaction("rw", [localDb.financeTransactions], async () => {
      await localDb.financeTransactions.put({
        id: uuidv4(),
        userId,
        amount: preset.amount,
        type: preset.type,
        category: preset.category,
        tags: [preset.category],
        description: `ثبت سریع برای ${preset.label.split(" - ")[0]}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      });
    });
  };

  const deleteTransaction = async (id: string) => {
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
  };

  const setBudget = async (categoryOrTag: string, limitAmount: number) => {
    const existing = await localDb.financeBudgets
      .where("userId")
      .equals(userId)
      .filter(
        (b) =>
          b.categoryOrTag.toLowerCase() === categoryOrTag.trim().toLowerCase(),
      )
      .first();

    await localDb.financeBudgets.put({
      id: existing?.id || uuidv4(),
      userId,
      categoryOrTag: categoryOrTag.trim(),
      limitAmount: limitAmount,
      period: "monthly",
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
      synced: false,
    });
  };

  const deleteBudget = async (id: string) => {
    await localDb.transaction(
      "rw",
      [localDb.financeBudgets, localDb.deletedRecords],
      async () => {
        await localDb.financeBudgets.delete(id);
        await localDb.deletedRecords.put({
          id,
          tableName: "financeBudgets",
          deletedAt: new Date(),
          synced: false,
        });
      },
    );
  };

  const getBudgetWarning = async (
    amountStr: string,
    category: string,
    tagsInput: string,
    type: "income" | "expense",
    transactions: FinanceTransaction[],
  ): Promise<string | null> => {
    let amtVal = parseFloat(toEnglishDigits(amountStr).replace(/,/g, ""));
    if (
      isNaN(amtVal) ||
      amtVal <= 0 ||
      !category.trim() ||
      type !== "expense"
    ) {
      return null;
    }

    const tags = (tagsInput || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const budget = await localDb.financeBudgets
      .where("userId")
      .equals(userId)
      .filter(
        (b) =>
          b.categoryOrTag.toLowerCase() === category.trim().toLowerCase() ||
          tags.includes(b.categoryOrTag.toLowerCase()),
      )
      .first();

    if (!budget) {
      return null;
    }

    const limit = Number(budget.limitAmount);
    const nowLocalParts = getJalaliDateParts(new Date());

    const currentMonthExpenses = transactions
      .filter((tx) => {
        if (tx.type !== "expense") {
          return false;
        }
        const matchCategory =
          tx.category.toLowerCase() === budget.categoryOrTag.toLowerCase();
        const matchTag =
          Array.isArray(tx.tags) &&
          tx.tags.some(
            (t: string) =>
              typeof t === "string" &&
              t.toLowerCase() === budget.categoryOrTag.toLowerCase(),
          );
        if (!matchCategory && !matchTag) {
          return false;
        }

        const txParts = getJalaliDateParts(new Date(tx.createdAt));
        return (
          txParts.month === nowLocalParts.month &&
          txParts.year === nowLocalParts.year
        );
      })
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const nextTotal = currentMonthExpenses + amtVal;
    if (nextTotal >= limit * 0.8) {
      return `هشدار: با ثبت این تراکنش، مخارج شما به ${(
        (nextTotal / limit) *
        100
      ).toFixed(0)}٪ از سقف بودجه تعیین شده (${formatPersianNumber(
        limit,
      )} تومان) برای عنوان یا تگ "${budget.categoryOrTag}" خواهد رسید.`;
    }

    return null;
  };

  return {
    saveManualTransaction,
    saveDirectTransaction,
    savePresetTransaction,
    deleteTransaction,
    setBudget,
    deleteBudget,
    getBudgetWarning,
  };
}
