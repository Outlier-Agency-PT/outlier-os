import { PageHeader } from "@/components/layout/page-header";
import { FinancialDashboard } from "@/components/financial/financial-dashboard";
import {
  getFinancialCategories,
  getTransactions,
  getPnLSummary,
} from "@/lib/queries/financial";
import { getClients } from "@/lib/queries/clients";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const year = new Date().getFullYear();
  const [summary, transactions, categories, clients] = await Promise.all([
    getPnLSummary(year),
    getTransactions(),
    getFinancialCategories(),
    getClients(),
  ]);

  return (
    <>
      <PageHeader title="Financeiro" description="Profit & Loss · Análise financeira da Outlier" />
      <FinancialDashboard
        summary={summary}
        transactions={transactions}
        categories={categories}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        year={year}
      />
    </>
  );
}
