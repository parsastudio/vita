"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import { localDb } from "@/lib/db/client";
import { migrateGuestData } from "./migration";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  useEffect(() => {
    async function initSession() {
      try {
        const activeUser = await getCurrentUserAction();
        if (activeUser) {
          setUser(activeUser);
          setIsGuest(false);
          localStorage.setItem("vita_cached_user", JSON.stringify(activeUser));
        } else {
          const guestCookie = Cookies.get("guest_mode");
          if (guestCookie === "true") {
            setIsGuest(true);
            setUser(null);
          } else {
            setShowAuthModal(true);
          }
        }
      } catch {
        const cachedUserStr = localStorage.getItem("vita_cached_user");
        if (cachedUserStr) {
          setUser(JSON.parse(cachedUserStr));
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
      } finally {
        setIsLoading(false);
      }
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
      localStorage.setItem("vita_cached_user", JSON.stringify(res.user));
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
      localStorage.setItem("vita_cached_user", JSON.stringify(res.user));
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
    localStorage.removeItem("vita_cached_user");
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
