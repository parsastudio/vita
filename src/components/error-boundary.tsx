"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 text-center">
          <div className="max-w-md space-y-6">
            <span className="text-5xl">⚠️</span>
            <h1 className="text-2xl font-bold font-vazir text-foreground">
              خطایی در اجرای برنامه رخ داده است
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed font-vazir">
              دسترسی به پایگاه داده محلی یا حافظه پنهان با اختلال مواجه شده است.
              لطفاً صفحه را بازنشانی کنید یا با بخش پشتیبانی در ارتباط باشید.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="w-full font-vazir"
            >
              تلاش مجدد و بارگذاری صفحه
            </Button>
          </div>
        </div>
      );
    }

    return this.children;
  }
}
