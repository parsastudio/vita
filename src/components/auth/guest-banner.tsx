"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";

export function GuestBanner() {
  const { isGuest, disableGuestMode, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading || !isGuest) return null;

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 py-2 px-4 text-center text-xs transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-1.5 flex-wrap">
        <span>اطلاعات شما به صورت محلی ذخیره می‌شود.</span>
        <button
          onClick={disableGuestMode}
          className="font-semibold underline hover:text-amber-700 dark:hover:text-amber-300 transition-colors focus:outline-none cursor-pointer"
        >
          برای جلوگیری از پاک شدن داده‌ها و همگام‌سازی با سرور، اینجا کلیک کنید
          تا حساب کاربری بسازید.
        </button>
      </div>
    </div>
  );
}
