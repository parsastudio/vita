"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
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
  setShowAuthModal: (show: boolean) => void;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

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
      setUser(res.user);
      setIsGuest(false);
      Cookies.remove("guest_mode");
      setShowAuthModal(false);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const logout = async () => {
    await signOutAction();
    setUser(null);
    setIsGuest(false);
    setShowAuthModal(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isLoading,
        showAuthModal,
        setShowAuthModal,
        enableGuestMode,
        disableGuestMode,
        signUp,
        signIn,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
