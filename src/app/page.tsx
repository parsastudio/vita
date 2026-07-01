import { Suspense } from "react";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { LanguageWidget } from "@/components/language/language-widget";
import { FinanceWidget } from "@/components/finance/finance-widget";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-8 animate-pulse">
          <div className="h-20 bg-muted/50 rounded-2xl w-full" />
          <div className="h-96 bg-muted/40 rounded-2xl w-full" />
        </div>
      }
    >
      <DashboardGrid
        languageWidget={<LanguageWidget />}
        financeWidget={<FinanceWidget />}
      />
    </Suspense>
  );
}
