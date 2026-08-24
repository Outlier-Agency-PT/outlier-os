"use client";

import { useState, Fragment } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, ExternalLink, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FluxoRow {
  row_number: number;
  group_label: string | null;
  label: string | null;
  categoria: string | null;
  is_subtotal: boolean;
  janeiro: number | null;
  fevereiro: number | null;
  marco: number | null;
  abril: number | null;
  maio: number | null;
  junho: number | null;
  julho: number | null;
  agosto: number | null;
  setembro: number | null;
  outubro: number | null;
  novembro: number | null;
  dezembro: number | null;
  total_anual: number | null;
}

interface ClienteRow {
  id: string;
  sheet_name: string;
  data: string | null;
  plataforma: string | null;
  vendedor: string | null;
  cliente: string;
  contrato_assinado: boolean | null;
  total_faturado: number | null;
  pagamentos: PagamentoClienteRow[];
}

interface PagamentoClienteRow {
  mes: string;
  ano: number;
  valor: number | null;
  fatura: boolean | null;
  pagamento: boolean | null;
  data_pagamento: number | null;
}

interface PagamentoRow {
  id: string;
  mes: string;
  ano: number;
  secao: string;
  nome: string;
  valor: number | null;
  iban_referencia: string | null;
  agendamento: boolean | null;
  aceite_daniel: boolean | null;
  pagamento_efetuada_a: string | null;
  numero_fatura: string | null;
}

interface KpiData {
  receitaTotal: number;
  despesaTotal: number;
  ebitda: number;
  lucroLiquido: number;
  saldoCaixa: number;
}

interface ChartPoint {
  mes: string;
  receita: number;
  despesa: number;
}

type MonthFields = {
  janeiro: number | null;
  fevereiro: number | null;
  marco: number | null;
  abril: number | null;
  maio: number | null;
  junho: number | null;
  julho: number | null;
  agosto: number | null;
  setembro: number | null;
  outubro: number | null;
  novembro: number | null;
  dezembro: number | null;
  total_anual: number | null;
};

interface GraficoDespesasRow extends MonthFields {
  id: string;
  categoria: string;
}

interface GraficoPnlRow extends MonthFields {
  id: string;
  metrica: string;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
}

interface ObjetivoRealizadoRow extends MonthFields {
  id: string;
  metrica: string;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  s1: number | null;
  s2: number | null;
}

interface PrevisaoAnoAnteriorRow extends MonthFields {
  id: string;
  metrica: string;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  s1: number | null;
  s2: number | null;
}

interface Props {
  kpis: KpiData;
  chartData: ChartPoint[];
  fluxoRows: FluxoRow[];
  clientes: ClienteRow[];
  pagamentos: PagamentoRow[];
  graficoDespesas: GraficoDespesasRow[];
  graficoPnl: GraficoPnlRow[];
  objetivoRealizado: ObjetivoRealizadoRow[];
  previsaoAnoAnterior: PrevisaoAnoAnteriorRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eur(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function isUrl(str: string | null | undefined): boolean {
  if (!str) return false;
  return str.startsWith("http://") || str.startsWith("https://");
}

const MONTH_COLS: { key: keyof FluxoRow; label: string }[] = [
  { key: "janeiro", label: "Jan" },
  { key: "fevereiro", label: "Fev" },
  { key: "marco", label: "Mar" },
  { key: "abril", label: "Abr" },
  { key: "maio", label: "Mai" },
  { key: "junho", label: "Jun" },
  { key: "julho", label: "Jul" },
  { key: "agosto", label: "Ago" },
  { key: "setembro", label: "Set" },
  { key: "outubro", label: "Out" },
  { key: "novembro", label: "Nov" },
  { key: "dezembro", label: "Dez" },
];

const SHEET_NAMES = [
  "Todos",
  "Clientes incubadora",
  "Renovações Incubadora",
  "Clientes Serviço",
  "Google Essential",
  "Google + Meta Pro",
  "Novo Serviço",
  "Clientes Maria",
];

const SECOES = [
  "Todos",
  "EQUIPA",
  "Pag. a 45 dias",
  "Pag. Serviços",
  "IMPOSTOS",
  "Outros pagamentos",
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  info,
  infoLink,
}: {
  label: string;
  value: number;
  info: string;
  infoLink: string;
}) {
  return (
    <Card className="flex-1 min-w-[160px]">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="shrink-0 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Info size={12} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 text-sm" side="bottom" align="start">
              <p className="text-foreground leading-relaxed mb-3">{info}</p>
              <a
                href={infoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#A12B2B] hover:underline text-xs font-medium"
              >
                Ver no Google Sheets <ExternalLink size={11} />
              </a>
            </PopoverContent>
          </Popover>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-xl font-bold tracking-tight">{eur(value)}</p>
      </CardContent>
    </Card>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["Clientes", "Fluxo de Caixa", "Pagamentos"] as const;
type Tab = (typeof TABS)[number];

// ─── Clientes Tab ─────────────────────────────────────────────────────────────

function ClientesTab({ clientes }: { clientes: ClienteRow[] }) {
  const [sheetFilter, setSheetFilter] = useState("Todos");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered =
    sheetFilter === "Todos" ? clientes : clientes.filter((c) => c.sheet_name === sheetFilter);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={sheetFilter} onValueChange={setSheetFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHEET_NAMES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} clientes</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8" />
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                Sheet
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                Plataforma
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                Vendedor
              </th>
              <th className="text-center px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                Contrato
              </th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                Total Faturado
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum cliente encontrado
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const isOpen = expanded.has(c.id);
              return (
                <Fragment key={c.id}>
                  <tr
                    className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => toggle(c.id)}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{c.cliente}</td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">
                      {c.sheet_name}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">
                      {c.plataforma ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">
                      {c.vendedor ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center hidden md:table-cell">
                      {c.contrato_assinado ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-muted-foreground">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {eur(c.total_faturado)}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t bg-muted/20">
                      <td colSpan={7} className="px-8 py-3">
                        {c.pagamentos.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Sem pagamentos registados</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="text-xs w-full">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="text-left pb-1 pr-6">Mês</th>
                                  <th className="text-right pb-1 pr-6">Valor</th>
                                  <th className="text-center pb-1 pr-6">Fatura</th>
                                  <th className="text-center pb-1 pr-6">Pagamento</th>
                                  <th className="text-left pb-1">Data Pagamento</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.pagamentos.map((p) => (
                                  <tr key={p.mes + p.ano} className="border-t border-border/40">
                                    <td className="py-1 pr-6 capitalize">{p.mes}</td>
                                    <td className="py-1 pr-6 text-right font-mono">
                                      {eur(p.valor)}
                                    </td>
                                    <td className="py-1 pr-6 text-center">
                                      {p.fatura ? (
                                        <span className="text-green-600">✓</span>
                                      ) : (
                                        <span className="text-muted-foreground">✗</span>
                                      )}
                                    </td>
                                    <td className="py-1 pr-6 text-center">
                                      {p.pagamento ? (
                                        <span className="text-green-600">✓</span>
                                      ) : (
                                        <span className="text-muted-foreground">✗</span>
                                      )}
                                    </td>
                                    <td className="py-1 text-muted-foreground">
                                      {p.data_pagamento ?? "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fluxo de Caixa Tab ───────────────────────────────────────────────────────

type FluxoSection = {
  key: string;
  label: string;
  // bodyRows: ALL data rows for this section (excludes explicit header rows)
  bodyRows: FluxoRow[];
  // isExplicit: true when the section started from a group_label-only row
  isExplicit: boolean;
};

function buildSections(rows: FluxoRow[]): { preRows: FluxoRow[]; sections: FluxoSection[] } {
  const preRows: FluxoRow[] = [];
  const sections: FluxoSection[] = [];
  let current: FluxoSection | null = null;
  let currentGroupLabel: string | null = null;

  for (const row of rows) {
    const gl = row.group_label;

    if (gl && !row.label) {
      // Explicit section header row (has group_label, no label) — becomes the header, not a body row
      current = { key: gl, label: gl, bodyRows: [], isExplicit: true };
      currentGroupLabel = gl;
      sections.push(current);
    } else if (gl && gl !== currentGroupLabel) {
      // Row belongs to a NEW group not seen before — create a synthetic section and include this row
      current = { key: gl, label: gl, bodyRows: [row], isExplicit: false };
      currentGroupLabel = gl;
      sections.push(current);
    } else if (current) {
      // Same group as current section (or no group_label) — add to current section
      current.bodyRows.push(row);
    } else {
      // No active section yet
      preRows.push(row);
    }
  }

  return { preRows, sections };
}

function FluxoTab({ rows }: { rows: FluxoRow[] }) {
  const { preRows, sections } = buildSections(rows);
  const allKeys = sections.map((s) => s.key);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleSection(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(allKeys));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  const isResumo = expanded.size === 0;
  const isDetalhe = allKeys.length > 0 && expanded.size === allKeys.length;

  const thBase = "sticky top-0 z-20 bg-muted/95 px-3 py-2.5 font-medium text-muted-foreground";
  const tdLabel = "sticky left-0 z-10 bg-card px-3 py-2 truncate max-w-[200px]";
  const tdLabelSubtotal = "sticky left-0 z-10 bg-muted/30 px-3 py-2 truncate max-w-[200px]";

  function renderBodyRow(row: FluxoRow) {
    return (
      <tr
        key={row.row_number}
        className={`border-t transition-colors ${
          row.is_subtotal ? "bg-muted/30 font-semibold" : "hover:bg-muted/20"
        }`}
      >
        <td className={row.is_subtotal ? tdLabelSubtotal : tdLabel}>
          {row.label ?? "—"}
        </td>
        <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
          {row.categoria ?? "—"}
        </td>
        {MONTH_COLS.map((m) => (
          <td key={m.key} className="px-3 py-2 text-right font-mono text-xs">
            {eur(row[m.key] as number | null)}
          </td>
        ))}
        <td className="px-3 py-2 text-right font-mono text-xs font-semibold">
          {eur(row.total_anual)}
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Vista:</span>
        <div className="flex rounded-md border overflow-hidden text-xs">
          <button
            onClick={collapseAll}
            className={`px-3 py-1.5 transition-colors ${
              isResumo
                ? "bg-foreground text-background font-medium"
                : "hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            Resumo
          </button>
          <button
            onClick={expandAll}
            className={`px-3 py-1.5 border-l transition-colors ${
              isDetalhe
                ? "bg-foreground text-background font-medium"
                : "hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            Detalhe
          </button>
        </div>
        {sections.length > 0 && (
          <span className="text-xs text-muted-foreground/60">
            {sections.length} secções
          </span>
        )}
      </div>

      <div className="rounded-lg border overflow-auto max-h-[70vh]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className={`${thBase} sticky left-0 z-30 text-left min-w-[200px]`}>
                Label
              </th>
              <th className={`${thBase} text-left min-w-[120px] hidden md:table-cell`}>
                Categoria
              </th>
              {MONTH_COLS.map((m) => (
                <th key={m.key} className={`${thBase} text-right min-w-[80px]`}>
                  {m.label}
                </th>
              ))}
              <th className={`${thBase} text-right min-w-[90px]`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Rows before any section */}
            {preRows.map((row) => renderBodyRow(row))}

            {/* Sections */}
            {sections.map((section) => {
              const isOpen = expanded.has(section.key);
              const detailRows = section.bodyRows.filter((r) => !r.is_subtotal);
              const subtotalRows = section.bodyRows.filter((r) => r.is_subtotal);

              return (
                <Fragment key={section.key}>
                  {/* Section header — always visible, clickable */}
                  <tr
                    className="bg-muted/60 cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => toggleSection(section.key)}
                  >
                    <td colSpan={15} className="px-3 py-2">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ChevronDown
                          size={13}
                          className={`shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                        />
                        {section.label}
                      </span>
                    </td>
                  </tr>

                  {/* Subtotal rows — always visible regardless of expand state */}
                  {subtotalRows.map((row) => renderBodyRow(row))}

                  {/* Detail rows — only when expanded */}
                  {isOpen && detailRows.map((row) => renderBodyRow(row))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Pagamentos Tab ───────────────────────────────────────────────────────────

function PagamentosTab({ pagamentos }: { pagamentos: PagamentoRow[] }) {
  const months = Array.from(new Set(pagamentos.map((p) => p.mes))).sort();
  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? "");
  const [secaoFilter, setSecaoFilter] = useState("Todos");

  const filtered = pagamentos.filter((p) => {
    if (p.mes !== selectedMonth) return false;
    if (secaoFilter !== "Todos" && p.secao !== secaoFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={secaoFilter} onValueChange={setSecaoFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECOES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">{filtered.length} pagamentos</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nome</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Valor</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                  IBAN / Referência
                </th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                  Agend.
                </th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                  Aceite
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                  Pago a
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                  Nº Fatura
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum pagamento encontrado
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{p.nome}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{eur(p.valor)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell text-xs font-mono">
                    {p.iban_referencia ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {p.agendamento ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-muted-foreground">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {p.aceite_daniel ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-muted-foreground">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">
                    {p.pagamento_efetuada_a ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    {isUrl(p.numero_fatura) ? (
                      <a
                        href={p.numero_fatura!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#A12B2B] hover:underline text-xs"
                      >
                        Ver fatura <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{p.numero_fatura ?? "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

const CHART_MONTHS: { key: keyof MonthFields; label: string }[] = [
  { key: "janeiro", label: "Jan" },
  { key: "fevereiro", label: "Fev" },
  { key: "marco", label: "Mar" },
  { key: "abril", label: "Abr" },
  { key: "maio", label: "Mai" },
  { key: "junho", label: "Jun" },
  { key: "julho", label: "Jul" },
  { key: "agosto", label: "Ago" },
  { key: "setembro", label: "Set" },
  { key: "outubro", label: "Out" },
  { key: "novembro", label: "Nov" },
  { key: "dezembro", label: "Dez" },
];

const CHART_TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
};

const DESPESAS_COLORS = [
  "#A12B2B", "#D97706", "#2D7A5A", "#3B6CB7", "#7C3AED",
  "#DB2777", "#0891B2", "#65A30D", "#9F1239", "#57534E",
];

const PNL_COLORS: Record<string, string> = {
  default0: "#A12B2B",
  default1: "#6b7280",
  default2: "#D97706",
};

function pnlColor(index: number): string {
  return PNL_COLORS[`default${index}`] ?? "#6b7280";
}

function metricaRows<T extends MonthFields & { metrica: string }>(
  rows: T[]
): Array<{ mes: string } & Record<string, number>> {
  return CHART_MONTHS.map(({ key, label }) => {
    const point: Record<string, number | string> = { mes: label };
    for (const row of rows) {
      point[row.metrica] = Number(row[key]) || 0;
    }
    return point as { mes: string } & Record<string, number>;
  });
}

function categoriaRows(
  rows: GraficoDespesasRow[]
): Array<{ mes: string } & Record<string, number>> {
  return CHART_MONTHS.map(({ key, label }) => {
    const point: Record<string, number | string> = { mes: label };
    for (const row of rows) {
      point[row.categoria] = Number(row[key]) || 0;
    }
    return point as { mes: string } & Record<string, number>;
  });
}

// ─── CollapsibleCard ──────────────────────────────────────────────────────────

function CollapsibleCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </CardHeader>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// ─── Empty chart state ────────────────────────────────────────────────────────

function EmptyChart({ message = "Sem dados — sincronize primeiro." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ─── Section 1: Despesas por Categoria ───────────────────────────────────────

function DespesasSection({ rows }: { rows: GraficoDespesasRow[] }) {
  const filteredRows = rows.filter((r) => r.categoria.toLowerCase() !== "total");
  if (filteredRows.length === 0) return <EmptyChart />;
  const chartData = categoriaRows(filteredRows);

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => eur(v)} contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {filteredRows.map((row, i) => (
            <Bar
              key={row.categoria}
              dataKey={row.categoria}
              stackId="a"
              fill={DESPESAS_COLORS[i % DESPESAS_COLORS.length]}
              radius={i === filteredRows.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Annual totals legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-1.5 pt-1 border-t">
        {filteredRows.map((row, i) => (
          <div key={row.categoria} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: DESPESAS_COLORS[i % DESPESAS_COLORS.length] }}
            />
            <span className="text-muted-foreground">{row.categoria}</span>
            <span className="font-mono font-medium">{eur(row.total_anual)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 2: PnL ───────────────────────────────────────────────────────────

function PnlSection({ rows }: { rows: GraficoPnlRow[] }) {
  if (rows.length === 0) return <EmptyChart />;
  const chartData = metricaRows(rows);
  const quarters: { label: string; key: "q1" | "q2" | "q3" | "q4" }[] = [
    { label: "Q1", key: "q1" },
    { label: "Q2", key: "q2" },
    { label: "Q3", key: "q3" },
    { label: "Q4", key: "q4" },
  ];

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => eur(v)} contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {rows.map((row, i) => (
            <Line
              key={row.metrica}
              type="monotone"
              dataKey={row.metrica}
              stroke={pnlColor(i)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Q1–Q4 totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t">
        {quarters.map(({ label, key }) => (
          <div key={key} className="rounded-lg border p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <div className="space-y-0.5">
              {rows.map((row, i) => (
                <p key={row.metrica} className="text-xs font-mono" style={{ color: pnlColor(i) }}>
                  {eur(row[key])}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 3: Objetivo vs Realizado ────────────────────────────────────────

function ObjetivoSection({ rows }: { rows: ObjetivoRealizadoRow[] }) {
  if (rows.length === 0) return <EmptyChart />;

  const objetivoRow = rows.find((r) =>
    r.metrica.toLowerCase().includes("objetivo")
  );
  const allZeros =
    objetivoRow &&
    CHART_MONTHS.every((m) => !objetivoRow[m.key] || Number(objetivoRow[m.key]) === 0);

  if (allZeros) {
    return (
      <EmptyChart message="Objetivos ainda não definidos para 2026." />
    );
  }

  const chartData = metricaRows(rows);
  const OBJETIVO_COLORS = ["#6b7280", "#A12B2B", "#3B6CB7"];

  const semesters = rows[0]
    ? [
        { label: "S1", key: "s1" as const },
        { label: "S2", key: "s2" as const },
      ]
    : [];

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => eur(v)} contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {rows.map((row, i) => (
            <Bar
              key={row.metrica}
              dataKey={row.metrica}
              fill={OBJETIVO_COLORS[i % OBJETIVO_COLORS.length]}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* S1 / S2 semester totals */}
      {semesters.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-1 border-t">
          {semesters.map(({ label, key }) => (
            <div key={key} className="rounded-lg border p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
              <div className="space-y-0.5">
                {rows.map((row, i) => (
                  <p
                    key={row.metrica}
                    className="text-xs font-mono"
                    style={{ color: OBJETIVO_COLORS[i % OBJETIVO_COLORS.length] }}
                  >
                    <span className="text-muted-foreground mr-1">{row.metrica}:</span>
                    {eur(row[key])}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section 4: Previsão vs Ano Anterior ─────────────────────────────────────

function PrevisaoSection({ rows }: { rows: PrevisaoAnoAnteriorRow[] }) {
  const filteredRows = rows.filter((r) => {
    const m = r.metrica;
    return !m.includes("%") && !m.includes("Impostos") && !m.includes("Despesas");
  });
  if (filteredRows.length === 0) return <EmptyChart />;
  const chartData = metricaRows(filteredRows);

  const PREVISAO_COLORS = ["#A12B2B", "#6b7280", "#3B6CB7"];
  const PREVISAO_DASHES = ["", "", "5 5"];

  // YoY % — first row vs second row total_anual
  const row2026 = filteredRows[0];
  const rowPrev = filteredRows[1];
  const yoyPct =
    row2026 && rowPrev && rowPrev.total_anual && rowPrev.total_anual !== 0
      ? (((row2026.total_anual ?? 0) - rowPrev.total_anual) / Math.abs(rowPrev.total_anual)) * 100
      : null;

  return (
    <div className="space-y-4">
      {/* YoY KPI */}
      {yoyPct !== null && (
        <div className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5">
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            YoY
          </span>
          <span
            className="text-lg font-bold font-mono"
            style={{ color: yoyPct >= 0 ? "#2D7A5A" : "#A12B2B" }}
          >
            {yoyPct >= 0 ? "+" : ""}
            {yoyPct.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">
            vs {rowPrev?.metrica ?? "ano anterior"}
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => eur(v)} contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {filteredRows.map((row, i) => (
            <Line
              key={row.metrica}
              type="monotone"
              dataKey={row.metrica}
              stroke={PREVISAO_COLORS[i % PREVISAO_COLORS.length]}
              strokeWidth={2}
              strokeDasharray={PREVISAO_DASHES[i] || undefined}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinanceiroDashboard({
  kpis,
  chartData,
  fluxoRows,
  clientes,
  pagamentos,
  graficoDespesas,
  graficoPnl,
  objetivoRealizado,
  previsaoAnoAnterior,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Clientes");

  return (
    <div className="p-6 space-y-6">
      {/* KPI Row */}
      <div className="flex flex-wrap gap-3">
        <KpiCard
          label="Receita Total"
          value={kpis.receitaTotal}
          info="Soma da receita sem IVA de Janeiro a Agosto 2026."
          infoLink="https://docs.google.com/spreadsheets/d/1suV8ty4xcLQ7LAfLQychq4wQBMuIOy8qg_Sma-SCFIY/edit?gid=845495189#gid=845495189"
        />
        <KpiCard
          label="Despesa Total"
          value={kpis.despesaTotal}
          info="Soma de todas as despesas fixas e variáveis de Janeiro a Agosto 2026."
          infoLink="https://docs.google.com/spreadsheets/d/1suV8ty4xcLQ7LAfLQychq4wQBMuIOy8qg_Sma-SCFIY/edit?gid=845495189#gid=845495189"
        />
        <KpiCard
          label="EBITDA"
          value={kpis.ebitda}
          info="Resultado operacional: Receita SEM IVA menos Total de Despesas. Negativo indica que as despesas superam a receita operacional."
          infoLink="https://docs.google.com/spreadsheets/d/1suV8ty4xcLQ7LAfLQychq4wQBMuIOy8qg_Sma-SCFIY/edit?gid=845495189#gid=845495189"
        />
        <KpiCard
          label="Lucro Líquido"
          value={kpis.lucroLiquido}
          info="Resultado após impostos, crédito bancário e deduções financeiras. Inclui IRC, IRS, SS e devolução do crédito Bankinter."
          infoLink="https://docs.google.com/spreadsheets/d/1suV8ty4xcLQ7LAfLQychq4wQBMuIOy8qg_Sma-SCFIY/edit?gid=845495189#gid=845495189"
        />
        <KpiCard
          label="Saldo Caixa"
          value={kpis.saldoCaixa}
          info="Saldo disponível em caixa em Agosto 2026."
          infoLink="https://docs.google.com/spreadsheets/d/1suV8ty4xcLQ7LAfLQychq4wQBMuIOy8qg_Sma-SCFIY/edit?gid=845495189#gid=845495189"
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Receita vs Despesa por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number) => eur(value)}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receita" name="Receita SEM IVA" fill="#A12B2B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despesa" name="Total Despesas" fill="#6b7280" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div>
        <div className="flex border-b mb-4 gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? "border-[#A12B2B] text-[#A12B2B]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Clientes" && <ClientesTab clientes={clientes} />}
        {activeTab === "Fluxo de Caixa" && <FluxoTab rows={fluxoRows} />}
        {activeTab === "Pagamentos" && <PagamentosTab pagamentos={pagamentos} />}
      </div>

      {/* ── Extra chart sections ─────────────────────────────────────────── */}
      <CollapsibleCard
        title="Despesas por Categoria"
        description="Breakdown mensal de despesas por categoria"
      >
        <DespesasSection rows={graficoDespesas} />
      </CollapsibleCard>

      <CollapsibleCard
        title="Profit & Loss"
        description="Receitas, Despesas e Impostos por mês"
      >
        <PnlSection rows={graficoPnl} />
      </CollapsibleCard>

      <CollapsibleCard
        title="Objetivo vs Realizado"
        description="Comparativo entre objetivo definido e receita realizada"
      >
        <ObjetivoSection rows={objetivoRealizado} />
      </CollapsibleCard>

      <CollapsibleCard
        title="Previsão vs Ano Anterior"
        description="Comparativo 2026 com o ano anterior e previsão para meses futuros"
      >
        <PrevisaoSection rows={previsaoAnoAnterior} />
      </CollapsibleCard>
    </div>
  );
}
