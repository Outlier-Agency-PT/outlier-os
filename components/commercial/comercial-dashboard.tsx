"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Phone, PhoneCall, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";

const MONTH_ORDER: Record<string, number> = {
  JANEIRO: 1, FEVEREIRO: 2, MARÇO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};

interface CloserRow {
  month_name: string;
  year: number;
  se_agendada: number | null;
  se_realizada: number | null;
  se_pitch: number | null;
  vendas: number | null;
  valor_vendas: number | null;
  cash_collected: number | null;
  valor_primeira_parcela: number | null;
}

interface MetasRow {
  month_name: string;
  year: number;
  meta_faturamento: number | null;
  meta_conversao: number | null;
}

interface LossRow {
  month_name: string;
  year: number;
  role: string;
  reason: string;
  count: number | null;
}

interface SdrRow {
  month_name: string;
  year: number;
  sdr_name: string;
  ligacoes_realizadas: number | null;
  ligacoes_atendidas: number | null;
  ligacoes_conversa: number | null;
  agendamentos: number | null;
}

interface BdrRow {
  month_name: string;
  year: number;
  bdr_name: string;
  mensagens_enviadas: number | null;
  mensagens_recebidas: number | null;
  ligacoes_conversa: number | null;
  agendamentos: number | null;
}

interface VendasRow {
  funnel_name: string;
  sale_type: string;
  vendas: number | null;
}

interface CallTrackingRow {
  month_name: string;
  year: number;
  chamadas_agendadas: number | null;
  chamadas_canceladas: number | null;
  no_show: number | null;
  chamadas_realizadas: number | null;
  chamadas_pitch: number | null;
  vendas: number | null;
}

interface ComercialDashboardProps {
  closerData: Record<string, unknown>[];
  closerServicosData: Record<string, unknown>[];
  sdrData: Record<string, unknown>[];
  sdrAllData: Record<string, unknown>[];
  bdrData: Record<string, unknown>[];
  callsData: Record<string, unknown>[];
  metasData: Record<string, unknown>[];
  lossData: Record<string, unknown>[];
  vendasData: Record<string, unknown>[];
}

function formatEur(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function pct(num: number | null, den: number | null) {
  if (!num || !den) return "—";
  return `${Math.round((num / den) * 100)}%`;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {Icon && <Icon className={`size-4 ${tone ?? ""}`} />}
        </div>
        <p className={`mt-1 text-2xl font-bold ${tone ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function ComercialDashboard({
  closerData,
  closerServicosData,
  sdrAllData,
  bdrData,
  callsData,
  metasData,
  lossData,
  vendasData,
}: ComercialDashboardProps) {
  const [activeFunnel, setActiveFunnel] = useState<"incubadora" | "servicos">("incubadora");
  const [activeView, setActiveView] = useState<"tabela" | "dashboard">("tabela");
  const [vendasView, setVendasView] = useState<"tabela" | "dashboard">("tabela");
  const [lossCloserView, setLossCloserView] = useState<"tabela" | "dashboard">("tabela");
  const [lossSdrView, setLossSdrView] = useState<"tabela" | "dashboard">("tabela");
  const [sdrView, setSdrView] = useState<"tabela" | "dashboard">("tabela");
  const [bdrView, setBdrView] = useState<"tabela" | "dashboard">("tabela");
  const [bdrExpanded, setBdrExpanded] = useState(false);
  const [callsView, setCallsView] = useState<"tabela" | "dashboard">("tabela");
  const [sdrExpanded, setSdrExpanded] = useState(false);

  const closer = closerData as unknown as CloserRow[];
  const closerServicos = closerServicosData as unknown as CloserRow[];
  const metas = metasData as unknown as MetasRow[];
  const loss = lossData as unknown as LossRow[];
  const sdrAll = sdrAllData as unknown as SdrRow[];
  const bdr = bdrData as unknown as BdrRow[];
  const calls = callsData as unknown as CallTrackingRow[];
  const vendas = vendasData as unknown as VendasRow[];

  // Meses com dados reais de vendas (valor_vendas > 0 ou vendas > 0)
  const activeCloser = closer
    .filter((r) => (r.vendas ?? 0) > 0 || (r.valor_vendas ?? 0) > 0)
    .sort((a, b) => (MONTH_ORDER[a.month_name] ?? 0) - (MONTH_ORDER[b.month_name] ?? 0));

  const latest = activeCloser[activeCloser.length - 1] ?? null;
  const latestMeta = metas.find((m) => m.month_name === latest?.month_name) ?? null;

  const metaAtingida =
    latest && latestMeta?.meta_faturamento
      ? Math.round(((latest.valor_vendas ?? 0) / latestMeta.meta_faturamento) * 100)
      : null;

  // Dados para gráfico — todos os meses ordenados
  const chartData = closer
    .map((r) => {
      const meta = metas.find((m) => m.month_name === r.month_name);
      return {
        mes: r.month_name.slice(0, 3),
        order: MONTH_ORDER[r.month_name] ?? 99,
        realizado: r.valor_vendas ?? 0,
        meta: meta?.meta_faturamento ?? 0,
      };
    })
    .filter((r) => r.realizado > 0 || r.meta > 0)
    .sort((a, b) => a.order - b.order);

  function buildTableRows(rows: CloserRow[]) {
    return rows
      .filter((r) => r.se_agendada !== null || r.se_realizada !== null || (r.valor_vendas ?? 0) > 0)
      .map((r) => {
        const meta = metas.find((m) => m.month_name === r.month_name);
        return { ...r, meta };
      })
      .sort((a, b) => (MONTH_ORDER[a.month_name] ?? 0) - (MONTH_ORDER[b.month_name] ?? 0));
  }

  const tableRows = activeFunnel === "incubadora"
    ? buildTableRows(closer)
    : buildTableRows(closerServicos);

  // Loss reasons
  const closerLoss = loss.filter((r) => r.role === "closer" && !r.reason.startsWith("Numero"));
  const sdrLoss = loss.filter((r) => r.role === "sdr" && !r.reason.startsWith("Numero"));
  const closerTotal = closerLoss.reduce((s, r) => s + (r.count ?? 0), 0);
  const sdrTotal = sdrLoss.reduce((s, r) => s + (r.count ?? 0), 0);

  // SDR rows — nomes reais apenas
  const sdrRows = sdrAll
    .filter((r) => r.sdr_name !== "TOTAL" && !r.sdr_name.startsWith("SDR_"))
    .sort((a, b) =>
      a.year !== b.year
        ? a.year - b.year
        : (MONTH_ORDER[a.month_name] ?? 0) - (MONTH_ORDER[b.month_name] ?? 0)
    );

  // BDR rows — excluir TOTAL
  const bdrRows = bdr
    .filter((r) => r.bdr_name !== "TOTAL")
    .sort((a, b) =>
      a.year !== b.year
        ? a.year - b.year
        : (MONTH_ORDER[a.month_name] ?? 0) - (MONTH_ORDER[b.month_name] ?? 0)
    );

  // Call tracking rows
  const callRows = calls
    .slice()
    .sort((a, b) =>
      a.year !== b.year
        ? a.year - b.year
        : (MONTH_ORDER[a.month_name] ?? 0) - (MONTH_ORDER[b.month_name] ?? 0)
    );

  // Vendas por funil — agrupadas por funnel_name
  const vendasByFunnel = (() => {
    const map = new Map<string, { direto: number; recuperacao: number }>();
    for (const r of vendas) {
      const entry = map.get(r.funnel_name) ?? { direto: 0, recuperacao: 0 };
      if (r.sale_type === "direto") entry.direto += r.vendas ?? 0;
      else if (r.sale_type === "recuperacao") entry.recuperacao += r.vendas ?? 0;
      map.set(r.funnel_name, entry);
    }
    return Array.from(map.entries())
      .map(([funnel, v]) => ({ funnel, ...v, total: v.direto + v.recuperacao }))
      .sort((a, b) => b.total - a.total);
  })();

  const mesLabel = latest?.month_name
    ? `${latest.month_name.slice(0, 1)}${latest.month_name.slice(1).toLowerCase()} ${latest.year}`
    : "—";

  return (
    <div className="space-y-6 p-8">
      {/* Secção 1 — KPIs do mês mais recente */}
      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          Último mês com dados: <strong className="text-foreground">{mesLabel}</strong>
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="SE Agendadas"
            value={latest?.se_agendada?.toString() ?? "—"}
            icon={Phone}
          />
          <KpiCard
            label="SE Realizadas"
            value={latest?.se_realizada?.toString() ?? "—"}
            icon={PhoneCall}
          />
          <KpiCard
            label="Vendas Fechadas"
            value={latest?.vendas?.toString() ?? "—"}
            icon={ShoppingCart}
            tone="text-green-600"
          />
          <KpiCard
            label="Receita"
            value={latest?.valor_vendas ? formatEur(latest.valor_vendas) : "—"}
            icon={TrendingUp}
            tone="text-green-600"
          />
          <KpiCard
            label="Meta Atingida"
            value={metaAtingida !== null ? `${metaAtingida}%` : "—"}
            icon={Target}
            tone={metaAtingida !== null && metaAtingida >= 100 ? "text-green-600" : "text-amber-500"}
          />
        </div>
      </div>

      {/* Secção 2 — Gráfico Receita vs Meta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receita vs Meta por mês</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v: number) => formatEur(v)} />
                <Legend />
                <Bar dataKey="realizado" name="Receita" fill="#10B981" />
                <Bar dataKey="meta" name="Meta" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Secção 3 — Tabela Funil por Mês */}
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Funil por Mês</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant={activeFunnel === "incubadora" ? "default" : "outline"} onClick={() => setActiveFunnel("incubadora")}>Incubadora</Button>
              <Button size="sm" variant={activeFunnel === "servicos" ? "default" : "outline"} onClick={() => setActiveFunnel("servicos")}>Serviços</Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={activeView === "tabela" ? "default" : "outline"} onClick={() => setActiveView("tabela")}>Tabela</Button>
            <Button size="sm" variant={activeView === "dashboard" ? "default" : "outline"} onClick={() => setActiveView("dashboard")}>Dashboard</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeView === "tabela" ? (
            tableRows.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Mês</th>
                      <th className="px-4 py-2 text-right font-medium">SE Agendadas</th>
                      <th className="px-4 py-2 text-right font-medium">SE Realizadas</th>
                      <th className="px-4 py-2 text-right font-medium">Show Up %</th>
                      <th className="px-4 py-2 text-right font-medium">SE + Pitch</th>
                      <th className="px-4 py-2 text-right font-medium">Vendas</th>
                      <th className="px-4 py-2 text-right font-medium">Receita</th>
                      <th className="px-4 py-2 text-right font-medium">Meta</th>
                      <th className="px-4 py-2 text-right font-medium">% Meta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tableRows.map((r) => {
                      const metaPct =
                        r.meta?.meta_faturamento && (r.valor_vendas ?? 0) > 0
                          ? Math.round(((r.valor_vendas ?? 0) / r.meta.meta_faturamento) * 100)
                          : null;
                      return (
                        <tr key={r.month_name} className="hover:bg-muted/50">
                          <td className="px-4 py-2 font-medium capitalize">
                            {r.month_name.slice(0, 1)}{r.month_name.slice(1).toLowerCase()} {r.year}
                          </td>
                          <td className="px-4 py-2 text-right">{r.se_agendada ?? "—"}</td>
                          <td className="px-4 py-2 text-right">{r.se_realizada ?? "—"}</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">
                            {pct(r.se_realizada, r.se_agendada)}
                          </td>
                          <td className="px-4 py-2 text-right">{r.se_pitch ?? "—"}</td>
                          <td className="px-4 py-2 text-right font-medium text-green-600">{r.vendas ?? "—"}</td>
                          <td className="px-4 py-2 text-right">
                            {r.valor_vendas ? formatEur(r.valor_vendas) : "—"}
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">
                            {r.meta?.meta_faturamento ? formatEur(r.meta.meta_faturamento) : "—"}
                          </td>
                          <td className={`px-4 py-2 text-right font-medium ${
                            metaPct !== null && metaPct >= 100 ? "text-green-600" : metaPct !== null ? "text-amber-500" : ""
                          }`}>
                            {metaPct !== null ? `${metaPct}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="space-y-6 p-6">
              {/* KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard
                  label="SE Agendadas"
                  value={tableRows.reduce((s, r) => s + (r.se_agendada ?? 0), 0).toString()}
                  icon={Phone}
                />
                <KpiCard
                  label="SE Realizadas"
                  value={tableRows.reduce((s, r) => s + (r.se_realizada ?? 0), 0).toString()}
                  icon={PhoneCall}
                />
                <KpiCard
                  label="SE + Pitch"
                  value={tableRows.reduce((s, r) => s + (r.se_pitch ?? 0), 0).toString()}
                  icon={TrendingUp}
                />
                <KpiCard
                  label="Vendas"
                  value={tableRows.reduce((s, r) => s + (r.vendas ?? 0), 0).toString()}
                  icon={ShoppingCart}
                  tone="text-green-600"
                />
                <KpiCard
                  label="Receita"
                  value={`€ ${tableRows.reduce((s, r) => s + (r.valor_vendas ?? 0), 0).toLocaleString("pt-PT")}`}
                  icon={Target}
                  tone="text-green-600"
                />
              </div>

              {/* Gráfico 1 — SE Agendadas vs Realizadas vs Pitch */}
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">SE Agendadas vs SE Realizadas vs SE + Pitch por mês</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tableRows.map((r) => ({
                    mes: r.month_name.slice(0, 3),
                    "SE Agendadas": r.se_agendada ?? 0,
                    "SE Realizadas": r.se_realizada ?? 0,
                    "SE + Pitch": r.se_pitch ?? 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="SE Agendadas" fill="#6366F1" />
                    <Bar dataKey="SE Realizadas" fill="#10B981" />
                    <Bar dataKey="SE + Pitch" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico 2 — Receita vs Meta */}
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Receita vs Meta por mês</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tableRows.map((r) => ({
                    mes: r.month_name.slice(0, 3),
                    Receita: r.valor_vendas ?? 0,
                    Meta: r.meta?.meta_faturamento ?? 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v: number) => `${v / 1000}k`} />
                    <Tooltip formatter={(v: number) => formatEur(v)} />
                    <Legend />
                    <Bar dataKey="Receita" fill="#10B981" />
                    <Bar dataKey="Meta" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico 3 — Show Up % */}
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Show Up % por mês</p>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={tableRows.map((r) => ({
                    mes: r.month_name.slice(0, 3),
                    "Show Up %": r.se_agendada
                      ? Math.round(((r.se_realizada ?? 0) / r.se_agendada) * 100)
                      : 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="Show Up %" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico 4 — % Meta atingida */}
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">% Meta atingida por mês</p>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={tableRows.map((r) => ({
                    mes: r.month_name.slice(0, 3),
                    "% Meta": r.meta?.meta_faturamento
                      ? Math.round(((r.valor_vendas ?? 0) / r.meta.meta_faturamento) * 100)
                      : 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="% Meta" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secção 8 — Vendas por Funil */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Vendas por Funil</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={vendasView === "tabela" ? "default" : "outline"} onClick={() => setVendasView("tabela")}>Tabela</Button>
            <Button size="sm" variant={vendasView === "dashboard" ? "default" : "outline"} onClick={() => setVendasView("dashboard")}>Dashboard</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {vendasByFunnel.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sem dados.</p>
          ) : vendasView === "tabela" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Funil</th>
                    <th className="px-4 py-2 text-right font-medium">Directas</th>
                    <th className="px-4 py-2 text-right font-medium">Recuperação</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vendasByFunnel.map((r) => (
                    <tr key={r.funnel} className="hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium">{r.funnel}</td>
                      <td className="px-4 py-2 text-right">{r.direto || "—"}</td>
                      <td className="px-4 py-2 text-right">{r.recuperacao || "—"}</td>
                      <td className="px-4 py-2 text-right font-medium text-green-600">{r.total || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {/* Gráfico 1 — BarChart horizontal */}
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Vendas por Funil</p>
                <ResponsiveContainer width="100%" height={vendasByFunnel.length * 45 + 60}>
                  <BarChart layout="vertical" data={vendasByFunnel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis type="category" dataKey="funnel" stroke="hsl(var(--muted-foreground))" fontSize={12} width={140} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="direto" name="Directas" stackId="a" fill="#10B981" />
                    <Bar dataKey="recuperacao" name="Recuperação" stackId="a" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico 2 — PieChart */}
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Directas vs Recuperação</p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Directas", value: vendasByFunnel.reduce((s, r) => s + r.direto, 0) },
                        { name: "Recuperação", value: vendasByFunnel.reduce((s, r) => s + r.recuperacao, 0) },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${Math.round(percent * 100)}%`
                      }
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#F59E0B" />
                    </Pie>
                    <Tooltip formatter={(v: number) => v} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secção 4 — Motivos de Loss */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Closer */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Motivos de Loss: Closer</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant={lossCloserView === "tabela" ? "default" : "outline"} onClick={() => setLossCloserView("tabela")}>Tabela</Button>
              <Button size="sm" variant={lossCloserView === "dashboard" ? "default" : "outline"} onClick={() => setLossCloserView("dashboard")}>Dashboard</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {closerLoss.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Sem dados.</p>
            ) : lossCloserView === "tabela" ? (
              <>
                <p className="px-4 pb-2 text-sm text-muted-foreground">Total de calls realizadas: {closerTotal}</p>
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Motivo</th>
                      <th className="px-4 py-2 text-right font-medium">Nº</th>
                      <th className="px-4 py-2 text-right font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {closerLoss
                      .slice()
                      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                      .map((r) => {
                        const cleanReason = r.reason.replace(/^\[.*?\]\s*/, "");
                        const p = closerTotal > 0 && r.count ? Math.round((r.count / closerTotal) * 100) : 0;
                        return (
                          <tr key={r.reason} className="hover:bg-muted/50">
                            <td className="px-4 py-2">{cleanReason}</td>
                            <td className="px-4 py-2 text-right font-medium">{r.count ?? "—"}</td>
                            <td className="px-4 py-2 text-right text-muted-foreground">{p}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="p-4">
                <p className="mb-2 text-sm text-muted-foreground">Total de calls realizadas: {closerTotal}</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={closerLoss
                    .slice()
                    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                    .map((r) => ({ reason: r.reason.replace(/^\[.*?\]\s*/, ""), count: r.count ?? 0 }))
                  }>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="reason" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-20} textAnchor="end" interval={0} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" name="Nº" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SDR */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Motivos de Loss: SDR</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant={lossSdrView === "tabela" ? "default" : "outline"} onClick={() => setLossSdrView("tabela")}>Tabela</Button>
              <Button size="sm" variant={lossSdrView === "dashboard" ? "default" : "outline"} onClick={() => setLossSdrView("dashboard")}>Dashboard</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {sdrLoss.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Sem dados.</p>
            ) : lossSdrView === "tabela" ? (
              <>
                <p className="px-4 pb-2 text-sm text-muted-foreground">Total de leads: {sdrTotal}</p>
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Motivo</th>
                      <th className="px-4 py-2 text-right font-medium">Nº</th>
                      <th className="px-4 py-2 text-right font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sdrLoss
                      .slice()
                      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                      .map((r) => {
                        const cleanReason = r.reason.replace(/^\[.*?\]\s*/, "");
                        const p = sdrTotal > 0 && r.count ? Math.round((r.count / sdrTotal) * 100) : 0;
                        return (
                          <tr key={r.reason} className="hover:bg-muted/50">
                            <td className="px-4 py-2">{cleanReason}</td>
                            <td className="px-4 py-2 text-right font-medium">{r.count ?? "—"}</td>
                            <td className="px-4 py-2 text-right text-muted-foreground">{p}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="p-4">
                <p className="mb-2 text-sm text-muted-foreground">Total de leads: {sdrTotal}</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sdrLoss
                    .slice()
                    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                    .map((r) => ({ reason: r.reason.replace(/^\[.*?\]\s*/, ""), count: r.count ?? 0 }))
                  }>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="reason" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-20} textAnchor="end" interval={0} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" name="Nº" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secção 5 — SDR por Mês (Incubadora) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">SDR por Mês: Incubadora</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={sdrView === "tabela" ? "default" : "outline"} onClick={() => setSdrView("tabela")}>Tabela</Button>
            <Button size="sm" variant={sdrView === "dashboard" ? "default" : "outline"} onClick={() => setSdrView("dashboard")}>Dashboard</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sdrRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sem dados.</p>
          ) : sdrView === "tabela" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Mês</th>
                    <th className="px-4 py-2 font-medium">SDR</th>
                    <th className="px-4 py-2 text-right font-medium">Lig. Realizadas</th>
                    <th className="px-4 py-2 text-right font-medium">Lig. Atendidas</th>
                    <th className="px-4 py-2 text-right font-medium">Atend. %</th>
                    <th className="px-4 py-2 text-right font-medium">Lig. + Conversa</th>
                    <th className="px-4 py-2 text-right font-medium">Agendamentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(sdrExpanded ? sdrRows : sdrRows.slice(0, 6)).map((r) => (
                    <tr key={`${r.year}-${r.month_name}-${r.sdr_name}`} className="hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium capitalize">
                        {r.month_name.slice(0, 1)}{r.month_name.slice(1).toLowerCase()} {r.year}
                      </td>
                      <td className="px-4 py-2">{r.sdr_name}</td>
                      <td className="px-4 py-2 text-right">{r.ligacoes_realizadas ?? "—"}</td>
                      <td className="px-4 py-2 text-right">{r.ligacoes_atendidas ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {pct(r.ligacoes_atendidas, r.ligacoes_realizadas)}
                      </td>
                      <td className="px-4 py-2 text-right">{r.ligacoes_conversa ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-medium text-green-600">{r.agendamentos ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sdrRows.length > 6 && (
                <div className="flex justify-center py-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setSdrExpanded(!sdrExpanded)} className="gap-1 text-muted-foreground">
                    {sdrExpanded ? (
                      <><ChevronUp size={14} /> Ver menos</>
                    ) : (
                      <><ChevronDown size={14} /> Ver mais ({sdrRows.length - 6})</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (() => {
            const SDR_COLORS: Record<string, string> = {
              ALCINO: "#10B981",
              JULIANA: "#6366F1",
              SUSANA: "#F59E0B",
              DAVI: "#EF4444",
              CATARINA: "#8B5CF6",
            };
            const sdrNames = Array.from(new Set(sdrRows.map((r) => r.sdr_name)));
            const sdrChartData = Array.from(
              sdrRows.reduce((map, r) => {
                const key = `${r.month_name} ${r.year}`;
                if (!map.has(key)) map.set(key, { mes: r.month_name.slice(0, 3), order: MONTH_ORDER[r.month_name] ?? 0 });
                const entry = map.get(key)!;
                entry[r.sdr_name + "_agendamentos"] = r.agendamentos ?? 0;
                entry[r.sdr_name + "_realizadas"] = r.ligacoes_realizadas ?? 0;
                entry[r.sdr_name + "_atendidas"] = r.ligacoes_atendidas ?? 0;
                return map;
              }, new Map<string, Record<string, unknown>>())
            ).map(([, v]) => v).sort((a, b) => (a.order as number) - (b.order as number));

            const alcinoData = sdrChartData.filter((r) => (r["ALCINO_realizadas"] as number) > 0);

            return (
              <div className="space-y-6 p-6">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Agendamentos por SDR por mês</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={sdrChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      {sdrNames.map((name) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name + "_agendamentos"}
                          name={name}
                          stroke={SDR_COLORS[name] ?? "#94A3B8"}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Ligações Realizadas vs Atendidas — ALCINO</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={alcinoData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="ALCINO_realizadas" name="Realizadas" fill="#6366F1" />
                      <Bar dataKey="ALCINO_atendidas" name="Atendidas" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Secção 6 — BDR por Mês */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">BDR por Mês</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={bdrView === "tabela" ? "default" : "outline"} onClick={() => setBdrView("tabela")}>Tabela</Button>
            <Button size="sm" variant={bdrView === "dashboard" ? "default" : "outline"} onClick={() => setBdrView("dashboard")}>Dashboard</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {bdrRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sem dados.</p>
          ) : bdrView === "tabela" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Mês</th>
                    <th className="px-4 py-2 font-medium">BDR</th>
                    <th className="px-4 py-2 text-right font-medium">Msg. Enviadas</th>
                    <th className="px-4 py-2 text-right font-medium">Msg. Recebidas</th>
                    <th className="px-4 py-2 text-right font-medium">Resposta %</th>
                    <th className="px-4 py-2 text-right font-medium">Lig. + Conversa</th>
                    <th className="px-4 py-2 text-right font-medium">Agendamentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(bdrExpanded ? bdrRows : bdrRows.slice(0, 6)).map((r) => (
                    <tr key={`${r.year}-${r.month_name}-${r.bdr_name}`} className="hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium capitalize">
                        {r.month_name.slice(0, 1)}{r.month_name.slice(1).toLowerCase()} {r.year}
                      </td>
                      <td className="px-4 py-2">{r.bdr_name}</td>
                      <td className="px-4 py-2 text-right">{r.mensagens_enviadas ?? "—"}</td>
                      <td className="px-4 py-2 text-right">{r.mensagens_recebidas ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {pct(r.mensagens_recebidas, r.mensagens_enviadas)}
                      </td>
                      <td className="px-4 py-2 text-right">{r.ligacoes_conversa ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-medium text-green-600">{r.agendamentos ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bdrRows.length > 6 && (
                <div className="flex justify-center py-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setBdrExpanded(!bdrExpanded)} className="gap-1 text-muted-foreground">
                    {bdrExpanded ? (
                      <><ChevronUp size={14} /> Ver menos</>
                    ) : (
                      <><ChevronDown size={14} /> Ver mais ({bdrRows.length - 6})</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (() => {
            const bdrAlcinoData = bdrRows
              .filter((r) => r.bdr_name === "ALCINO")
              .map((r) => ({
                mes: r.month_name.slice(0, 3),
                enviadas: r.mensagens_enviadas ?? 0,
                recebidas: r.mensagens_recebidas ?? 0,
                resposta: r.mensagens_enviadas && r.mensagens_recebidas
                  ? Math.round((r.mensagens_recebidas / r.mensagens_enviadas) * 100)
                  : 0,
                order: MONTH_ORDER[r.month_name] ?? 0,
              }))
              .sort((a, b) => a.order - b.order);

            return (
              <div className="space-y-6 p-6">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Mensagens Enviadas vs Recebidas — ALCINO</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={bdrAlcinoData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="enviadas" name="Enviadas" fill="#6366F1" />
                      <Bar dataKey="recebidas" name="Recebidas" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Resposta % por mês — ALCINO</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={bdrAlcinoData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="resposta" name="Resposta %" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Secção 7 — Rastreamento de Calls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Rastreamento de Calls</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={callsView === "tabela" ? "default" : "outline"} onClick={() => setCallsView("tabela")}>Tabela</Button>
            <Button size="sm" variant={callsView === "dashboard" ? "default" : "outline"} onClick={() => setCallsView("dashboard")}>Dashboard</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {callRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sem dados.</p>
          ) : callsView === "tabela" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Mês</th>
                    <th className="px-4 py-2 text-right font-medium">Agendadas</th>
                    <th className="px-4 py-2 text-right font-medium">Canceladas</th>
                    <th className="px-4 py-2 text-right font-medium">Cancel. %</th>
                    <th className="px-4 py-2 text-right font-medium">No-Show</th>
                    <th className="px-4 py-2 text-right font-medium">No-Show %</th>
                    <th className="px-4 py-2 text-right font-medium">Realizadas</th>
                    <th className="px-4 py-2 text-right font-medium">Com Pitch</th>
                    <th className="px-4 py-2 text-right font-medium">Vendas</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {callRows.map((r) => (
                    <tr key={`${r.year}-${r.month_name}`} className="hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium capitalize">
                        {r.month_name.slice(0, 1)}{r.month_name.slice(1).toLowerCase()} {r.year}
                      </td>
                      <td className="px-4 py-2 text-right">{r.chamadas_agendadas ?? "—"}</td>
                      <td className="px-4 py-2 text-right">{r.chamadas_canceladas ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {pct(r.chamadas_canceladas, r.chamadas_agendadas)}
                      </td>
                      <td className="px-4 py-2 text-right">{r.no_show ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {pct(r.no_show, r.chamadas_agendadas)}
                      </td>
                      <td className="px-4 py-2 text-right">{r.chamadas_realizadas ?? "—"}</td>
                      <td className="px-4 py-2 text-right">{r.chamadas_pitch ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-medium text-green-600">{r.vendas ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (() => {
            const callsChartData = callRows.map((r) => ({
              mes: r.month_name.slice(0, 3),
              agendadas: r.chamadas_agendadas ?? 0,
              realizadas: r.chamadas_realizadas ?? 0,
              pitch: r.chamadas_pitch ?? 0,
              vendas: r.vendas ?? 0,
              canceladas: r.chamadas_canceladas ?? 0,
              no_show: r.no_show ?? 0,
            }));

            return (
              <div className="space-y-6 p-6">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Agendadas vs Realizadas vs Com Pitch</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={callsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="agendadas" name="Agendadas" fill="#6366F1" />
                      <Bar dataKey="realizadas" name="Realizadas" fill="#10B981" />
                      <Bar dataKey="pitch" name="Com Pitch" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Canceladas vs No-Show vs Vendas</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={callsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="canceladas" name="Canceladas" fill="#EF4444" />
                      <Bar dataKey="no_show" name="No-Show" fill="#F59E0B" />
                      <Bar dataKey="vendas" name="Vendas" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}

function LossCard({ title, rows, total }: { title: string; rows: LossRow[]; total: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">Motivo</th>
                <th className="px-4 py-2 text-right font-medium">Nº</th>
                <th className="px-4 py-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows
                .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                .map((r) => {
                  const cleanReason = r.reason.replace(/^\[.*?\]\s*/, "");
                  const p = total > 0 && r.count ? Math.round((r.count / total) * 100) : 0;
                  return (
                    <tr key={r.reason} className="hover:bg-muted/50">
                      <td className="px-4 py-2">{cleanReason}</td>
                      <td className="px-4 py-2 text-right font-medium">{r.count ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{p}%</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
