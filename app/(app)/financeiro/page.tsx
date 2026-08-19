import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { SyncFinanceiroButton } from "@/components/financeiro/sync-financeiro-button";
import { FinanceiroDashboard } from "@/components/financeiro/financeiro-dashboard";

export const dynamic = "force-dynamic";

const KPI_LABELS = {
  receita: "Total Receita SEM IVA",
  despesa: "Total de Despesas",
  ebitda: "EBITDA",
  lucro: "LUCRO LIQUIDO (c/ crédito)",
  saldo: "SALDO CAIXA",
};

const MONTH_COLS = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

const MONTH_LABELS: Record<string, string> = {
  janeiro: "Jan",
  fevereiro: "Fev",
  marco: "Mar",
  abril: "Abr",
  maio: "Mai",
  junho: "Jun",
  julho: "Jul",
  agosto: "Ago",
  setembro: "Set",
  outubro: "Out",
  novembro: "Nov",
  dezembro: "Dez",
};

export default async function FinanceiroPage() {
  const supabase = await createClient();

  // Auth & role check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user?.id ?? "")
    .eq("active", true)
    .maybeSingle();

  if (!member || member.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch all data in parallel
  const [fluxoRes, clientesRes, pagamentosRes] = await Promise.all([
    supabase
      .from("financial_fluxo_caixa")
      .select("*")
      .order("row_number", { ascending: true }),
    supabase
      .from("financial_clientes")
      .select("*, pagamentos:financial_clientes_pagamentos(*)")
      .order("sheet_name")
      .order("cliente"),
    supabase
      .from("financial_pagamentos")
      .select("*")
      .order("mes")
      .order("secao")
      .order("nome"),
  ]);

  const fluxoRows = fluxoRes.data ?? [];
  const clientes = clientesRes.data ?? [];
  const pagamentos = pagamentosRes.data ?? [];

  // Compute KPIs from fluxo rows
  function sumLabel(label: string): number {
    const row = fluxoRows.find((r) => r.label === label);
    if (!row) return 0;
    return MONTH_COLS.reduce((acc, m) => acc + (Number(row[m]) || 0), 0);
  }

  function lastNonNullMonth(label: string): number {
    const row = fluxoRows.find((r) => r.label === label);
    if (!row) return 0;
    const months = [...MONTH_COLS].reverse();
    const col = months.find((m) => row[m] != null && row[m] !== "0" && Number(row[m]) !== 0);
    return col ? Number(row[col]) || 0 : 0;
  }

  const kpis = {
    receitaTotal: sumLabel(KPI_LABELS.receita),
    despesaTotal: sumLabel(KPI_LABELS.despesa),
    ebitda: sumLabel(KPI_LABELS.ebitda),
    lucroLiquido: sumLabel(KPI_LABELS.lucro),
    saldoCaixa: lastNonNullMonth(KPI_LABELS.saldo),
  };

  // Build chart data
  const receitaRow = fluxoRows.find((r) => r.label === KPI_LABELS.receita);
  const despesaRow = fluxoRows.find((r) => r.label === KPI_LABELS.despesa);

  const chartData = MONTH_COLS.map((m) => ({
    mes: MONTH_LABELS[m],
    receita: Number(receitaRow?.[m]) || 0,
    despesa: Number(despesaRow?.[m]) || 0,
  }));

  // Last sync time
  const saldoRow = fluxoRows.find((r) => r.label === KPI_LABELS.saldo);
  const lastSyncAt = saldoRow?.updated_at ?? null;

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Dashboard financeiro · Mapa de Clientes, Fluxo de Caixa e Pagamentos 2026"
        actions={<SyncFinanceiroButton lastSyncAt={lastSyncAt} />}
      />
      <FinanceiroDashboard
        kpis={kpis}
        chartData={chartData}
        fluxoRows={fluxoRows}
        clientes={clientes.map((c) => ({
          ...c,
          pagamentos: c.pagamentos ?? [],
        }))}
        pagamentos={pagamentos}
      />
    </>
  );
}
