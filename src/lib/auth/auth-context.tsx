"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";

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
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  useEffect(() => {
    const guestCookie = Cookies.get("guest_mode");
    const activeUser = localStorage.getItem("active_user");

    if (activeUser) {
      setUser(JSON.parse(activeUser));
      setIsGuest(false);
    } else if (guestCookie === "true") {
      setIsGuest(true);
      setUser(null);
    } else {
      setShowAuthModal(true);
    }
    setIsLoading(false);
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

  const login = (email: string) => {
    const mockUser = { id: crypto.randomUUID(), email };
    localStorage.setItem("active_user", JSON.stringify(mockUser));
    Cookies.remove("guest_mode");
    setUser(mockUser);
    setIsGuest(false);
    setShowAuthModal(false);
  };

  const logout = () => {
    localStorage.removeItem("active_user");
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
        login,
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
