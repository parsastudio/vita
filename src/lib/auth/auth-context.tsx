"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import { localDb } from "@/lib/db/client";
import {
  signUpAction,
  signInAction,
  signOutAction,
  getCurrentUserAction,
} from "@/app/actions/auth";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isGuest: boolean;
  isLoading: boolean;
  showAuthModal: boolean;
  showLogoutModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  setShowLogoutModal: (show: boolean) => void;
  enableGuestMode: () => void;
  disableGuestMode: () => void;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  confirmLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getUnsyncedCount(userId: string): Promise<number> {
  const unsyncedCards = await localDb.languageCards
    .where("userId")
    .equals(userId)
    .filter((c) => !c.synced)
    .count();
  const unsyncedTransactions = await localDb.financeTransactions
    .where("userId")
    .equals(userId)
    .filter((t) => !t.synced)
    .count();
  const unsyncedBudgets = await localDb.financeBudgets
    .where("userId")
    .equals(userId)
    .filter((b) => !b.synced)
    .count();
  const unsyncedSettings = await localDb.userSettings
    .where("userId")
    .equals(userId)
    .filter((s) => !s.synced)
    .count();
  const unsyncedDeletes = await localDb.deletedRecords
    .filter((d) => !d.synced)
    .count();

  return (
    unsyncedCards +
    unsyncedTransactions +
    unsyncedBudgets +
    unsyncedSettings +
    unsyncedDeletes
  );
}

async function migrateGuestData(newUserId: string): Promise<void> {
  await localDb.transaction(
    "rw",
    [
      localDb.languageCards,
      localDb.financeTransactions,
      localDb.financeBudgets,
      localDb.userSettings,
    ],
    async () => {
      await localDb.languageCards
        .where("userId")
        .equals("guest")
        .modify({ userId: newUserId, synced: false, updatedAt: new Date() });

      await localDb.financeTransactions
        .where("userId")
        .equals("guest")
        .modify({ userId: newUserId, synced: false, updatedAt: new Date() });

      const existingBudgets = await localDb.financeBudgets
        .where("userId")
        .equals(newUserId)
        .toArray();

      const guestBudgets = await localDb.financeBudgets
        .where("userId")
        .equals("guest")
        .toArray();

      for (const gb of guestBudgets) {
        const matching = existingBudgets.find(
          (eb) =>
            eb.categoryOrTag.toLowerCase() === gb.categoryOrTag.toLowerCase(),
        );
        if (matching) {
          await localDb.financeBudgets.update(matching.id, {
            limitAmount: gb.limitAmount,
            updatedAt: new Date(),
            synced: false,
          });
          await localDb.financeBudgets.delete(gb.id);
        } else {
          await localDb.financeBudgets.update(gb.id, {
            userId: newUserId,
            synced: false,
            updatedAt: new Date(),
          });
        }
      }

      const existingSettings = await localDb.userSettings
        .where("userId")
        .equals(newUserId)
        .first();

      const guestSettings = await localDb.userSettings
        .where("userId")
        .equals("guest")
        .first();

      if (guestSettings) {
        if (existingSettings) {
          const mergedModules = Array.from(
            new Set([
              ...existingSettings.enabledModules,
              ...guestSettings.enabledModules,
            ]),
          );
          await localDb.userSettings.update(existingSettings.id, {
            enabledModules: mergedModules,
            updatedAt: new Date(),
            synced: false,
          });
          await localDb.userSettings.delete(guestSettings.id);
        } else {
          await localDb.userSettings.update(guestSettings.id, {
            userId: newUserId,
            synced: false,
            updatedAt: new Date(),
          });
        }
      }
    },
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  useEffect(() => {
    async function initSession() {
      const activeUser = await getCurrentUserAction();
      if (activeUser) {
        setUser(activeUser);
        setIsGuest(false);
      } else {
        const guestCookie = Cookies.get("guest_mode");
        if (guestCookie === "true") {
          setIsGuest(true);
          setUser(null);
        } else {
          setShowAuthModal(true);
        }
      }
      setIsLoading(false);
    }
    initSession();
  }, []);

  const enableGuestMode = () => {
    Cookies.set("guest_mode", "true", { expires: 3650 });
    setIsGuest(true);
    setUser(null);
    setShowAuthModal(false);
  };

  const disableGuestMode = () => {
    Cookies.remove("guest_mode");
    setIsGuest(false);
    setShowAuthModal(true);
  };

  const signUp = async (email: string, password: string) => {
    const res = await signUpAction(email, password);
    if (res.success && res.user) {
      await migrateGuestData(res.user.id);
      setUser(res.user);
      setIsGuest(false);
      Cookies.remove("guest_mode");
      setShowAuthModal(false);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const signIn = async (email: string, password: string) => {
    const res = await signInAction(email, password);
    if (res.success && res.user) {
      await migrateGuestData(res.user.id);
      setUser(res.user);
      setIsGuest(false);
      Cookies.remove("guest_mode");
      setShowAuthModal(false);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const logout = async () => {
    if (user) {
      const unsyncedCount = await getUnsyncedCount(user.id);
      if (unsyncedCount > 0) {
        setShowLogoutModal(true);
        return;
      }
    }
    await confirmLogout();
  };

  const confirmLogout = async () => {
    if (user) {
      localStorage.removeItem(`last_synced_at_${user.id}`);
    }
    await signOutAction();
    await localDb.transaction(
      "rw",
      [
        localDb.languageCards,
        localDb.financeTransactions,
        localDb.financeBudgets,
        localDb.userSettings,
        localDb.deletedRecords,
      ],
      async () => {
        await Promise.all([
          localDb.languageCards.clear(),
          localDb.financeTransactions.clear(),
          localDb.financeBudgets.clear(),
          localDb.userSettings.clear(),
          localDb.deletedRecords.clear(),
        ]);
      },
    );
    setUser(null);
    setIsGuest(false);
    setShowLogoutModal(false);
    setShowAuthModal(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isLoading,
        showAuthModal,
        showLogoutModal,
        setShowAuthModal,
        setShowLogoutModal,
        enableGuestMode,
        disableGuestMode,
        signUp,
        signIn,
        logout,
        confirmLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
}
