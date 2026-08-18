"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Target, DollarSign, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";

const MONTH_ORDER: Record<string, number> = {
  Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6,
  Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12,
};

interface MensalRow {
  month_name: string;
  year: number;
  funnel: string;
  alcance: number | null;
  budget: number | null;
  leads: number | null;
  mql: number | null;
  sql_count: number | null;
  vendas_texto: string | null;
  visitas_perfil: number | null;
  seguidores: number | null;
}

interface SemanalRow {
  week_label: string;
  week_start: string;
  week_end: string;
  year: number;
  conteudos_alcance: number | null;
  conteudos_visitas_perfil: number | null;
  conteudos_seguidores: number | null;
  conteudos_budget: number | null;
  incubadora_alcance: number | null;
  incubadora_leads: number | null;
  incubadora_mql: number | null;
  incubadora_sql: number | null;
  incubadora_budget: number | null;
  ebook_alcance: number | null;
  ebook_leads: number | null;
  ebook_mql: number | null;
  ebook_sql: number | null;
  ebook_budget: number | null;
}

interface RoasRow {
  month_name: string;
  year: number;
  receita_fechada: number | null;
  fechos: number | null;
}

export interface MarketingDashboardProps {
  mensalData: Record<string, unknown>[];
  semanalData: Record<string, unknown>[];
  roasData: Record<string, unknown>[];
}

function formatEur(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function fmt(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-PT");
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

export function MarketingDashboard({ mensalData, semanalData, roasData }: MarketingDashboardProps) {
  const [activeFunnel, setActiveFunnel] = useState<"incubadora" | "outlier" | "ebook" | "conteudos">("incubadora");
  const [mensalView, setMensalView] = useState<"tabela" | "dashboard">("tabela");
  const [semanalView, setSemanalView] = useState<"tabela" | "dashboard">("tabela");
  const [roasView, setRoasView] = useState<"tabela" | "dashboard">("tabela");
  const [semanalExpanded, setSemanalExpanded] = useState(false);

  const mensal = mensalData as unknown as MensalRow[];
  const semanal = semanalData as unknown as SemanalRow[];
  const roas = roasData as unknown as RoasRow[];

  // ── KPIs acumulados Jan–Jul ──────────────────────────────────────────────
  const leadsTotal = mensal
    .filter((r) => ["incubadora", "outlier", "ebook"].includes(r.funnel))
    .reduce((s, r) => s + (r.leads ?? 0), 0);

  const mqlTotal = mensal
    .filter((r) => ["incubadora", "outlier", "ebook"].includes(r.funnel))
    .reduce((s, r) => s + (r.mql ?? 0), 0);

  const sqlTotal = mensal
    .filter((r) => ["incubadora", "outlier", "ebook"].includes(r.funnel))
    .reduce((s, r) => s + (r.sql_count ?? 0), 0);

  const receitaTotal = roas.reduce((s, r) => s + (r.receita_fechada ?? 0), 0);
  const fechosTotal = roas.reduce((s, r) => s + (r.fechos ?? 0), 0);

  // ── Dados por mês filtrados por funil ────────────────────────────────────
  const mensalFunnel = mensal
    .filter((r) => r.funnel === activeFunnel)
    .filter((r) => r.funnel === "conteudos"
      ? (r.alcance ?? 0) > 0 || (r.budget ?? 0) > 0
      : (r.leads ?? 0) > 0
    )
    .sort((a, b) => (MONTH_ORDER[a.month_name] ?? 0) - (MONTH_ORDER[b.month_name] ?? 0));

  // ── Dados semanais ordenados ─────────────────────────────────────────────
  const semanalRows = semanal
    .slice()
    .sort((a, b) => {
      const toDate = (s: string) => {
        const [d, m, y] = s.split("/");
        return new Date(`${y}-${m}-${d}`).getTime();
      };
      return toDate(a.week_start) - toDate(b.week_start);
    });

  const semanalVisible = semanalExpanded ? semanalRows : semanalRows.slice(0, 6);

  // ── ROAS ordenado ────────────────────────────────────────────────────────
  const roasRows = roas
    .filter((r) => (r.receita_fechada ?? 0) > 0 || (r.fechos ?? 0) > 0)
    .sort((a, b) => (MONTH_ORDER[a.month_name] ?? 0) - (MONTH_ORDER[b.month_name] ?? 0));

  return (
    <div className="space-y-6">

      {/* ── Secção 1 — KPIs ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total Leads" value={fmt(leadsTotal)} icon={Users} />
        <KpiCard label="Total MQL" value={fmt(mqlTotal)} icon={Target} />
        <KpiCard label="Total SQL" value={fmt(sqlTotal)} icon={TrendingUp} />
        <KpiCard label="Receita Fechada" value={receitaTotal > 0 ? formatEur(receitaTotal) : "—"} icon={DollarSign} tone="text-green-600" />
        <KpiCard label="Total Fechos" value={fmt(fechosTotal)} icon={ShoppingCart} tone="text-green-600" />
      </div>

      {/* ── Secção 2 — Dados por Mês ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dados por Mês</CardTitle>
            <div className="flex flex-wrap gap-2">
              {(["incubadora", "outlier", "ebook", "conteudos"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={activeFunnel === f ? "default" : "outline"}
                  onClick={() => setActiveFunnel(f)}
                  className="capitalize"
                >
                  {f.slice(0, 1).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={mensalView === "tabela" ? "default" : "outline"} onClick={() => setMensalView("tabela")}>Tabela</Button>
            <Button size="sm" variant={mensalView === "dashboard" ? "default" : "outline"} onClick={() => setMensalView("dashboard")}>Dashboard</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {mensalFunnel.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sem dados para este funil.</p>
          ) : mensalView === "tabela" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Mês</th>
                    <th className="px-4 py-2 text-right font-medium">Alcance</th>
                    {activeFunnel === "conteudos" ? (
                      <>
                        <th className="px-4 py-2 text-right font-medium">Visitas Perfil</th>
                        <th className="px-4 py-2 text-right font-medium">Seguidores</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-2 text-right font-medium">Leads</th>
                        <th className="px-4 py-2 text-right font-medium">MQL</th>
                        <th className="px-4 py-2 text-right font-medium">SQL</th>
                        <th className="px-4 py-2 text-right font-medium">Vendas</th>
                      </>
                    )}
                    <th className="px-4 py-2 text-right font-medium">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mensalFunnel.map((r) => (
                    <tr key={`${r.month_name}-${r.year}`} className="hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium">{r.month_name} {r.year}</td>
                      <td className="px-4 py-2 text-right">{fmt(r.alcance)}</td>
                      {activeFunnel === "conteudos" ? (
                        <>
                          <td className="px-4 py-2 text-right">{fmt(r.visitas_perfil)}</td>
                          <td className="px-4 py-2 text-right">{fmt(r.seguidores)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2 text-right">{fmt(r.leads)}</td>
                          <td className="px-4 py-2 text-right">{fmt(r.mql)}</td>
                          <td className="px-4 py-2 text-right">{fmt(r.sql_count)}</td>
                          <td className="px-4 py-2 text-right">{r.vendas_texto ?? "—"}</td>
                        </>
                      )}
                      <td className="px-4 py-2 text-right">{r.budget !== null ? formatEur(r.budget) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeFunnel === "conteudos" ? (
            <div className="space-y-6 p-6">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Alcance por mês</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mensalFunnel.map((r) => ({ mes: r.month_name, Alcance: r.alcance ?? 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => v.toLocaleString("pt-PT")} />
                    <Legend />
                    <Bar dataKey="Alcance" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Seguidores por mês</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mensalFunnel.map((r) => ({ mes: r.month_name, Seguidores: r.seguidores ?? 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Seguidores" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {mensalFunnel.some((r) => (r.visitas_perfil ?? 0) > 0) && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Visitas ao Perfil por mês</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={mensalFunnel.map((r) => ({ mes: r.month_name.slice(0, 3), "Visitas Perfil": r.visitas_perfil ?? 0 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Visitas Perfil" fill="#6366F1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {mensalFunnel.some((r) => (r.seguidores ?? 0) > 0) && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Seguidores por mês</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={mensalFunnel.map((r) => ({ mes: r.month_name.slice(0, 3), Seguidores: r.seguidores ?? 0 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Seguidores" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Leads vs MQL vs SQL por mês</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mensalFunnel.map((r) => ({
                    mes: r.month_name,
                    Leads: r.leads ?? 0,
                    MQL: r.mql ?? 0,
                    SQL: r.sql_count ?? 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Leads" fill="#6366F1" />
                    <Bar dataKey="MQL" fill="#10B981" />
                    <Bar dataKey="SQL" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Budget por mês</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mensalFunnel.map((r) => ({ mes: r.month_name, Budget: r.budget ?? 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v: number) => formatEur(v)} />
                    <Tooltip formatter={(v: number) => formatEur(v)} />
                    <Legend />
                    <Bar dataKey="Budget" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {mensalFunnel.some((r) => (r.alcance ?? 0) > 0) && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Alcance por mês</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={mensalFunnel.map((r) => ({ mes: r.month_name.slice(0, 3), Alcance: r.alcance ?? 0 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Alcance" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Secção 3 — Dados por Semana ───────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dados por Semana</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant={semanalView === "tabela" ? "default" : "outline"} onClick={() => setSemanalView("tabela")}>Tabela</Button>
              <Button size="sm" variant={semanalView === "dashboard" ? "default" : "outline"} onClick={() => setSemanalView("dashboard")}>Dashboard</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {semanalRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sem dados semanais.</p>
          ) : semanalView === "tabela" ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 font-medium" title="Semana">Semana</th>
                      <th className="px-4 py-2 font-medium" title="Início">Início</th>
                      <th className="px-4 py-2 font-medium" title="Fim">Fim</th>
                      <th className="px-4 py-2 text-right font-medium" title="Incubadora Leads">Incub. Leads</th>
                      <th className="px-4 py-2 text-right font-medium" title="Incubadora MQL">Incub. MQL</th>
                      <th className="px-4 py-2 text-right font-medium" title="Incubadora Budget">Incub. Budget</th>
                      <th className="px-4 py-2 text-right font-medium" title="Ebook Leads">Ebook Leads</th>
                      <th className="px-4 py-2 text-right font-medium" title="Conteúdos Alcance">Cont. Alcance</th>
                      <th className="px-4 py-2 text-right font-medium" title="Conteúdos Budget">Cont. Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {semanalVisible.map((r) => (
                      <tr key={r.week_start} className="hover:bg-muted/50">
                        <td className="px-4 py-2 font-medium">{r.week_label}</td>
                        <td className="px-4 py-2 text-muted-foreground">{r.week_start}</td>
                        <td className="px-4 py-2 text-muted-foreground">{r.week_end}</td>
                        <td className="px-4 py-2 text-right">{fmt(r.incubadora_leads)}</td>
                        <td className="px-4 py-2 text-right">{fmt(r.incubadora_mql)}</td>
                        <td className="px-4 py-2 text-right">{r.incubadora_budget !== null ? formatEur(r.incubadora_budget) : "—"}</td>
                        <td className="px-4 py-2 text-right">{fmt(r.ebook_leads)}</td>
                        <td className="px-4 py-2 text-right">{fmt(r.conteudos_alcance)}</td>
                        <td className="px-4 py-2 text-right">{r.conteudos_budget !== null ? formatEur(r.conteudos_budget) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {semanalRows.length > 6 && (
                <div className="flex justify-center py-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setSemanalExpanded(!semanalExpanded)} className="gap-1 text-muted-foreground">
                    {semanalExpanded ? (
                      <><ChevronUp size={14} /> Ver menos</>
                    ) : (
                      <><ChevronDown size={14} /> Ver mais ({semanalRows.length - 6})</>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6 p-6">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Leads Incubadora por semana</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={semanalRows.map((r) => ({ semana: r.week_label, Leads: r.incubadora_leads ?? 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="semana" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-15} textAnchor="end" interval={0} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Leads" stroke="#6366F1" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Alcance Conteúdos por semana</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={semanalRows.map((r) => ({ semana: r.week_label, Alcance: r.conteudos_alcance ?? 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="semana" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-15} textAnchor="end" interval={0} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => v.toLocaleString("pt-PT")} />
                    <Legend />
                    <Line type="monotone" dataKey="Alcance" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Secção 4 — ROAS & Fechos ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">ROAS & Fechos</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={roasView === "tabela" ? "default" : "outline"} onClick={() => setRoasView("tabela")}>Tabela</Button>
            <Button size="sm" variant={roasView === "dashboard" ? "default" : "outline"} onClick={() => setRoasView("dashboard")}>Dashboard</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {roasRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sem dados de ROAS.</p>
          ) : roasView === "tabela" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Mês</th>
                    <th className="px-4 py-2 text-right font-medium">Receita Fechada</th>
                    <th className="px-4 py-2 text-right font-medium">Fechos</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {roasRows.map((r) => (
                    <tr key={`${r.month_name}-${r.year}`} className="hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium">{r.month_name} {r.year}</td>
                      <td className="px-4 py-2 text-right font-medium text-green-600">
                        {r.receita_fechada !== null ? formatEur(r.receita_fechada) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">{fmt(r.fechos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Receita Fechada por mês</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={roasRows.map((r) => ({ mes: r.month_name, Receita: r.receita_fechada ?? 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v: number) => formatEur(v)} />
                    <Tooltip formatter={(v: number) => formatEur(v)} />
                    <Legend />
                    <Bar dataKey="Receita" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Fechos por mês</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={roasRows.map((r) => ({ mes: r.month_name, Fechos: r.fechos ?? 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Fechos" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
