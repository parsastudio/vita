"use client";

import React from "react";
import { useAuth } from "@/lib/auth/auth-context";

export function GuestBanner() {
  const { isGuest, disableGuestMode } = useAuth();

  if (!isGuest) return null;

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 py-2 px-4 text-center text-xs transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-1.5 flex-wrap">
        <span>Your data is stored locally in this browser.</span>
        <button
          onClick={disableGuestMode}
          className="font-semibold underline hover:text-amber-700 dark:hover:text-amber-300 transition-colors focus:outline-none"
        >
          Create an account to prevent data loss and sync with the cloud.
        </button>
      </div>
    </div>
  );
}
