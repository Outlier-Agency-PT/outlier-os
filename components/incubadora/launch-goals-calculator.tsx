"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Info, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { updateStudentLaunchAction } from "@/lib/actions/student-launches";
import { calcDebrief } from "@/lib/types/student-launches";
import type { StudentLaunch, StudentLaunchDebrief } from "@/lib/types/student-launches";

interface Props {
  launch: StudentLaunch;
  debrief: StudentLaunchDebrief | null;
  studentId: string;
}

type FormKey =
  | "budget_distribuicao" | "budget_captacao" | "budget_antecipacao" | "budget_remarketing"
  | "ticket"
  | "cpl_1" | "cpl_2" | "cpl_3"
  | "pct_organic_1" | "pct_organic_2" | "pct_organic_3"
  | "conversion_rate_leads"
  | "attendance_rate";

interface FormState {
  budget_distribuicao: string;
  budget_captacao: string;
  budget_antecipacao: string;
  budget_remarketing: string;
  ticket: string;
  cpl_1: string;
  cpl_2: string;
  cpl_3: string;
  pct_organic_1: string;
  pct_organic_2: string;
  pct_organic_3: string;
  conversion_rate_leads: string;
  attendance_rate: string; // local only — not persisted
}

function initForm(l: StudentLaunch, prevAttendance = ""): FormState {
  return {
    budget_distribuicao: l.budget_distribuicao?.toString() ?? "",
    budget_captacao: l.budget_captacao?.toString() ?? "",
    budget_antecipacao: l.budget_antecipacao?.toString() ?? "",
    budget_remarketing: l.budget_remarketing?.toString() ?? "",
    ticket: l.ticket?.toString() ?? "",
    cpl_1: l.lead_goal_1_paid?.toString() ?? "",
    cpl_2: l.lead_goal_2_paid?.toString() ?? "",
    cpl_3: l.lead_goal_3_paid?.toString() ?? "",
    pct_organic_1: l.lead_goal_1_organic?.toString() ?? "",
    pct_organic_2: l.lead_goal_2_organic?.toString() ?? "",
    pct_organic_3: l.lead_goal_3_organic?.toString() ?? "",
    conversion_rate_leads: l.conversion_rate_leads?.toString() ?? "",
    attendance_rate: prevAttendance,
  };
}

function p(s: string): number | null {
  if (s === "" || s == null) return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function safediv(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null;
  const r = a / b;
  return isFinite(r) ? r : null;
}

function calcScenario(
  budgetCap: number | null,
  cpl: number | null,
  pctOrganic: number | null,
  attendanceRate: number | null,
  convRate: number | null,
  ticket: number | null,
  investTotal: number | null,
) {
  const leadsPagas = safediv(budgetCap, cpl);
  const pctOrg = pctOrganic != null ? pctOrganic / 100 : null;
  const denom = pctOrg != null ? 1 - pctOrg : null;
  const leadsTotais = denom != null && denom > 0 && leadsPagas != null
    ? leadsPagas / denom
    : leadsPagas; // if no organic %, totais = pagas
  const participantes = attendanceRate != null && leadsTotais != null
    ? leadsTotais * (attendanceRate / 100)
    : null;
  const vendas = convRate != null && participantes != null
    ? participantes * (convRate / 100)
    : null;
  const receita = ticket != null && vendas != null ? vendas * ticket : null;
  const roas = safediv(receita, investTotal);

  return {
    leadsPagas: leadsPagas != null ? Math.round(leadsPagas) : null,
    leadsTotais: leadsTotais != null ? Math.round(leadsTotais) : null,
    participantes: participantes != null ? Math.round(participantes) : null,
    vendas: vendas != null ? Math.round(vendas) : null,
    receita,
    roas,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 cursor-help text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ResultRow({
  label,
  value,
  real,
  higherIsBetter = true,
  tooltip,
}: {
  label: string;
  value: string;
  real?: { formatted: string; raw: number | null; estimated: number | null } | null;
  higherIsBetter?: boolean;
  tooltip?: string;
}) {
  const pct =
    real?.raw != null && real?.estimated != null && real.estimated !== 0
      ? ((real.raw - real.estimated) / Math.abs(real.estimated)) * 100
      : null;
  const isGood = pct != null ? (higherIsBetter ? pct >= 0 : pct <= 0) : null;

  return (
    <div>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </p>
      <div className="mt-0.5 flex min-h-[26px] items-center rounded border border-input bg-muted/60 px-2 text-xs text-muted-foreground select-none">
        {value}
      </div>
      {real != null && (
        <div className="mt-0.5 flex items-center gap-1 text-[10px]">
          <span className="text-muted-foreground">Real: {real.formatted}</span>
          {pct != null && (
            <span className={isGood ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  step,
  placeholder,
  className = "",
  tooltip,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  placeholder?: string;
  className?: string;
  tooltip?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[11px] text-muted-foreground flex items-center gap-1">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 h-7 text-xs"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LaunchGoalsCalculator({ launch, debrief, studentId }: Props) {
  const [form, setForm] = useState<FormState>(() => initForm(launch));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attendanceRef = useRef(form.attendance_rate);

  useEffect(() => {
    setForm(initForm(launch, attendanceRef.current));
  }, [launch.id]);

  useEffect(() => {
    attendanceRef.current = form.attendance_rate;
  }, [form.attendance_rate]);

  const save = useCallback(
    async (f: FormState) => {
      const bTotal =
        (p(f.budget_distribuicao) ?? 0) +
        (p(f.budget_captacao) ?? 0) +
        (p(f.budget_antecipacao) ?? 0) +
        (p(f.budget_remarketing) ?? 0);
      const investTotal = bTotal > 0 ? bTotal : null;
      const ticket = p(f.ticket);
      const beCount =
        investTotal != null && ticket != null && ticket > 0
          ? Math.ceil(investTotal / ticket)
          : null;
      const beRevenue = beCount != null && ticket != null ? beCount * ticket : null;

      await updateStudentLaunchAction(launch.id, studentId, {
        budget_distribuicao: p(f.budget_distribuicao),
        budget_captacao: p(f.budget_captacao),
        budget_antecipacao: p(f.budget_antecipacao),
        budget_remarketing: p(f.budget_remarketing),
        ticket,
        lead_goal_1_paid: p(f.cpl_1),
        lead_goal_2_paid: p(f.cpl_2),
        lead_goal_3_paid: p(f.cpl_3),
        lead_goal_1_organic: p(f.pct_organic_1),
        lead_goal_2_organic: p(f.pct_organic_2),
        lead_goal_3_organic: p(f.pct_organic_3),
        conversion_rate_leads: p(f.conversion_rate_leads),
        sales_break_even_count: beCount,
        sales_break_even_revenue: beRevenue,
      });
    },
    [launch.id, studentId],
  );

  function handleChange(key: FormKey, value: string) {
    const next = { ...form, [key]: value };
    setForm(next);
    if (key === "attendance_rate") return; // local only
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(next), 1500);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Derived numerics
  const budgetCap = p(form.budget_captacao);
  const ticket = p(form.ticket);
  const convRate = p(form.conversion_rate_leads);
  const attRate = p(form.attendance_rate);
  const bTotal =
    (p(form.budget_distribuicao) ?? 0) +
    (p(form.budget_captacao) ?? 0) +
    (p(form.budget_antecipacao) ?? 0) +
    (p(form.budget_remarketing) ?? 0);
  const investTotal = bTotal > 0 ? bTotal : null;

  const beCount =
    investTotal != null && ticket != null && ticket > 0
      ? Math.ceil(investTotal / ticket)
      : null;
  const beRevenue = beCount != null && ticket != null ? beCount * ticket : null;

  const s1 = calcScenario(budgetCap, p(form.cpl_1), p(form.pct_organic_1), attRate, convRate, ticket, investTotal);
  const s2 = calcScenario(budgetCap, p(form.cpl_2), p(form.pct_organic_2), attRate, convRate, ticket, investTotal);
  const s3 = calcScenario(budgetCap, p(form.cpl_3), p(form.pct_organic_3), attRate, convRate, ticket, investTotal);

  const hasDebrief = launch.status === "concluido" && debrief != null && debrief.leads_totais != null;
  const dc = hasDebrief && debrief ? calcDebrief(debrief, ticket) : null;

  function fmtN(n: number | null, suffix = ""): string {
    if (n == null) return "Ainda sem dados";
    return (
      n.toLocaleString("pt-PT", { maximumFractionDigits: 0 }) +
      (suffix ? ` ${suffix}` : "")
    );
  }
  function fmtEur(n: number | null): string {
    if (n == null) return "Ainda sem dados";
    return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€";
  }
  function fmtRoas(n: number | null): string {
    if (n == null) return "Ainda sem dados";
    return n.toFixed(2) + "x";
  }

  const scenarios = [
    { label: "Conservador", star: false, cpl: "cpl_1" as FormKey, pct: "pct_organic_1" as FormKey, s: s1 },
    { label: "Esperado", star: true, cpl: "cpl_2" as FormKey, pct: "pct_organic_2" as FormKey, s: s2 },
    { label: "Ambicioso", star: false, cpl: "cpl_3" as FormKey, pct: "pct_organic_3" as FormKey, s: s3 },
  ];

  return (
    <div className="space-y-5">
      {/* Break-even */}
      <div className="rounded border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <SectionTitle>Break-even</SectionTitle>
          <InfoTooltip text="Ponto de equilíbrio — o mínimo de vendas que precisas de fazer para recuperar o investimento. Abaixo deste valor tens prejuízo." />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <div className="text-sm">
            <span className="text-muted-foreground text-xs">Vendas mínimas · </span>
            <span className="font-semibold">{beCount != null ? beCount : "Ainda sem dados"}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground text-xs">Receita mínima · </span>
            <span className="font-semibold">{fmtEur(beRevenue)}</span>
          </div>
          {investTotal != null && (
            <div className="text-sm">
              <span className="text-muted-foreground text-xs">Investimento total · </span>
              <span className="font-semibold">{fmtEur(investTotal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Budget */}
      <section className="space-y-2">
        <SectionTitle>Orçamento</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ["budget_distribuicao", "Distribuição (€)", undefined],
            ["budget_captacao", "Captação (€)", "Orçamento de publicidade para captação de leads. É o valor que mais influencia o CPL."],
            ["budget_antecipacao", "Antecipação (€)", undefined],
            ["budget_remarketing", "Remarketing (€)", undefined],
          ] as [FormKey, string, string | undefined][]).map(([key, label, tip]) => (
            <NumInput
              key={key}
              label={label}
              value={form[key]}
              onChange={(v) => handleChange(key, v)}
              tooltip={tip}
            />
          ))}
        </div>
      </section>

      {/* Ticket */}
      <section>
        <div className="flex flex-wrap items-end gap-3">
          <NumInput
            label="Ticket (€)"
            value={form.ticket}
            onChange={(v) => handleChange("ticket", v)}
            placeholder="ex: 997"
            className="w-36"
          />
          <p className="mb-1 text-[11px] text-muted-foreground">
            Editar aqui não altera o preço base do produto.
          </p>
        </div>
      </section>

      {/* Taxas base */}
      <section className="space-y-2">
        <SectionTitle>Taxas base (partilhadas pelos 3 cenários)</SectionTitle>
        <div className="flex flex-wrap gap-3">
          <div>
            <NumInput
              label="Taxa de presença (%)"
              value={form.attendance_rate}
              onChange={(v) => handleChange("attendance_rate", v)}
              step="0.1"
              placeholder="ex: 30"
              className="w-40"
            />
            <p className="mt-0.5 text-[10px] text-muted-foreground">Não é guardada</p>
          </div>
          <NumInput
            label="Taxa de conversão (%)"
            value={form.conversion_rate_leads}
            onChange={(v) => handleChange("conversion_rate_leads", v)}
            step="0.1"
            placeholder="ex: 5"
            className="w-40"
            tooltip="Percentagem de leads que se tornam clientes. Inclui compras ao vivo e em follow-up."
          />
        </div>
      </section>

      {/* 3 cenários */}
      <section>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {scenarios.map(({ label, star, cpl, pct, s }) => (
            <div key={label} className="rounded border bg-card p-3 space-y-3">
              <p className="flex items-center gap-1 text-xs font-semibold">
                {label}
                {star && <Star className="size-3 text-amber-500 fill-amber-500" />}
              </p>

              {/* Entradas */}
              <div className="space-y-2">
                <NumInput
                  label="CPL previsto (€)"
                  value={form[cpl]}
                  onChange={(v) => handleChange(cpl, v)}
                  step="0.01"
                  placeholder="ex: 2.50"
                  tooltip="Custo Por Lead estimado — quanto esperas pagar, em média, por cada inscrição na lista."
                />
                <NumInput
                  label="% leads orgânicas"
                  value={form[pct]}
                  onChange={(v) => handleChange(pct, v)}
                  step="0.1"
                  placeholder="ex: 20"
                  tooltip="Percentagem de leads que chegam sem custo de publicidade (ex: partilhas, recomendações). O resto são leads pagas."
                />
              </div>

              {/* Resultados */}
              <div className="rounded bg-muted/40 p-2 space-y-1.5">
                <ResultRow
                  label="Leads pagas"
                  value={fmtN(s.leadsPagas)}
                  real={
                    hasDebrief && debrief
                      ? {
                          formatted: fmtN(debrief.leads_totais != null ? Math.round(debrief.leads_totais * (1 - (p(form[pct]) ?? 0) / 100)) : null),
                          raw: debrief.leads_totais != null ? Math.round(debrief.leads_totais * (1 - (p(form[pct]) ?? 0) / 100)) : null,
                          estimated: s.leadsPagas,
                        }
                      : null
                  }
                />
                <ResultRow
                  label="Leads totais"
                  value={fmtN(s.leadsTotais)}
                  real={
                    hasDebrief && debrief
                      ? { formatted: fmtN(debrief.leads_totais), raw: debrief.leads_totais, estimated: s.leadsTotais }
                      : null
                  }
                />
                <ResultRow
                  label="Participantes"
                  value={fmtN(s.participantes)}
                  real={
                    hasDebrief && debrief
                      ? { formatted: fmtN(debrief.ao_vivo_estavel), raw: debrief.ao_vivo_estavel, estimated: s.participantes }
                      : null
                  }
                />
                <ResultRow
                  label="Vendas estimadas"
                  value={fmtN(s.vendas)}
                  real={
                    hasDebrief && debrief
                      ? { formatted: fmtN(debrief.total_vendas), raw: debrief.total_vendas, estimated: s.vendas }
                      : null
                  }
                />
                <ResultRow
                  label="Receita prevista"
                  value={fmtEur(s.receita)}
                  real={
                    hasDebrief && dc
                      ? { formatted: fmtEur(dc.receita_liquida_total), raw: dc.receita_liquida_total, estimated: s.receita }
                      : null
                  }
                />
                <ResultRow
                  label="ROAS previsto"
                  value={fmtRoas(s.roas)}
                  real={
                    hasDebrief && dc
                      ? { formatted: fmtRoas(dc.roas_total), raw: dc.roas_total, estimated: s.roas }
                      : null
                  }
                  tooltip="Return On Ad Spend — quantas vezes esperas recuperar o investimento em publicidade. Ex: 3x = €3 gerados por cada €1 investido."
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
