"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex flex-col w-full max-w-7xl mx-auto px-4 py-8 md:py-12 gap-8 animate-pulse">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-6 gap-4">
          <div className="space-y-2">
            <div className="h-8 w-44 bg-muted rounded-lg" />
            <div className="h-4 w-72 bg-muted rounded-md" />
          </div>
          <div className="h-8 w-28 bg-muted rounded-full" />
        </header>
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-[500px] bg-card border border-border rounded-2xl" />
          <div className="h-[500px] bg-card border border-border rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
