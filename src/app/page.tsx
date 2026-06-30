"use client";

import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

export default function Home() {
  return (
    <DashboardGrid
      languageWidget={
        <div className="p-8 border border-border bg-card rounded-2xl shadow-sm">
          <h2 className="text-xl font-bold font-vazir mb-2 text-foreground">
            Language Learning
          </h2>
          <p className="text-sm text-muted-foreground">
            Smart sentence parser and Spaced Repetition System (SRS).
          </p>
          <div className="mt-6 h-32 bg-muted/35 rounded-xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
            Widget placeholder - Component integration next
          </div>
        </div>
      }
      financeWidget={
        <div className="p-8 border border-border bg-card rounded-2xl shadow-sm">
          <h2 className="text-xl font-bold font-vazir mb-2 text-foreground">
            Smart Finance
          </h2>
          <p className="text-sm text-muted-foreground">
            Quick entry, natural language transaction processing and budgeting.
          </p>
          <div className="mt-6 h-32 bg-muted/35 rounded-xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
            Widget placeholder - Component integration next
          </div>
        </div>
      }
    />
  );
}
