import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { LanguageWidget } from "@/components/language/language-widget";
import { FinanceWidget } from "@/components/finance/finance-widget";

export default function Home() {
  return (
    <DashboardGrid
      languageWidget={<LanguageWidget />}
      financeWidget={<FinanceWidget />}
    />
  );
}
