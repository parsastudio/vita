"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isStorageBlocked: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isStorageBlocked: false,
  };

  public componentDidMount() {
    if (typeof window !== "undefined") {
      window.addEventListener("vita:storage_blocked", this.handleStorageBlocked);
    }
  }

  public componentWillUnmount() {
    if (typeof window !== "undefined") {
      window.removeEventListener("vita:storage_blocked", this.handleStorageBlocked);
    }
  }

  private handleStorageBlocked = () => {
    this.setState({ hasError: true, isStorageBlocked: true });
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 text-center">
          <div className="max-w-md space-y-6">
            <span className="text-5xl">⚠️</span>
            <h1 className="text-2xl font-bold font-vazir text-foreground">
              {this.state.isStorageBlocked
                ? "دسترسی به حافظه محلی مرورگر مسدود است"
                : "خطایی در اجرای برنامه رخ داده است"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed font-vazir">
              {this.state.isStorageBlocked
                ? "مرورگر شما در حالت Private Browsing شدید قرار دارد یا دسترسی به پایگاه‌داده محلی (IndexedDB) را مسدود کرده است. برای استفاده از تمامی قابلیت‌های آفلاین ویتا، لطفاً حالت عادی مرورگر را فعال کنید."
                : "دسترسی به پایگاه داده محلی یا حافظه پنهان با اختلال مواجه شده است. لطفاً صفحه را بازنشانی کنید یا با بخش پشتیبانی در ارتباط باشید."}
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

    return this.props.children;
  }
}
