"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchTeamMetricsAction } from "@/lib/actions/team-metrics";
import type { TeamMetricsResult } from "@/lib/queries/team-metrics";

// ── Period computation ──────────────────────────────────────────────────────

type PeriodMode = "hoje" | "semana_atual" | "semana" | "mes";

interface PeriodBounds {
  start: Date;
  end: Date;
  label: string;
}

function getMonday(ref: Date): Date {
  const d = new Date(ref);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function computePeriod(mode: PeriodMode, weekOffset: number, monthOffset: number): PeriodBounds {
  const now = new Date();

  if (mode === "hoje") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "Hoje" };
  }

  if (mode === "semana_atual") {
    const start = getMonday(now);
    const end = new Date(now);
    return { start, end, label: "Esta Semana" };
  }

  if (mode === "semana") {
    const baseMonday = getMonday(now);
    const start = new Date(baseMonday);
    start.setDate(baseMonday.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const fmt = (d: Date) => d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
    const endDisplay = new Date(end);
    endDisplay.setDate(end.getDate() - 1);
    return { start, end, label: `${fmt(start)} – ${fmt(endDisplay)}` };
  }

  // mes — monthOffset = -1 = mês anterior, -2 = há dois meses, etc.
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const start = new Date(target.getFullYear(), target.getMonth(), 1);
  const end = new Date(target.getFullYear(), target.getMonth() + 1, 1);
  const label = target.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  return { start, end, label };
}

// ── Formatting ──────────────────────────────────────────────────────────────

function fmtMinutes(min: number): string {
  if (!min || min === 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtEstimated(h: number): string {
  if (!h || h === 0) return "—";
  return h % 1 === 0 ? `${h}h` : `${Number(h.toFixed(1))}h`;
}

// ── Stat cell ───────────────────────────────────────────────────────────────

function StatCell({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="bg-card px-4 py-4 md:px-6 md:py-5">
      <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <p
        className={cn(
          "text-[32px] font-light leading-none tracking-[-0.03em] tabular-nums",
          highlight && "text-red-500",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface Props {
  initialData: TeamMetricsResult;
}

const MODES: { key: PeriodMode; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "semana_atual", label: "Esta Semana" },
  { key: "semana", label: "Semanas Anteriores" },
  { key: "mes", label: "Meses Anteriores" },
];

export function TeamMetricsClient({ initialData }: Props) {
  // Estado de período — só é calculado no cliente (nunca no SSR)
  const [mode, setMode] = useState<PeriodMode>("semana_atual");
  const [weekOffset, setWeekOffset] = useState(-1);
  const [monthOffset, setMonthOffset] = useState(-1);
  const [data, setData] = useState<TeamMetricsResult>(initialData);
  const [isPending, startTransition] = useTransition();

  // Deriva o label do navegador de semana/mês só quando necessário
  function getPeriodLabel(): string {
    if (mode === "semana") return computePeriod("semana", weekOffset, monthOffset).label;
    if (mode === "mes") return computePeriod("mes", weekOffset, monthOffset).label;
    return "";
  }

  function refetch(start: Date, end: Date) {
    startTransition(async () => {
      try {
        const result = await fetchTeamMetricsAction(start.toISOString(), end.toISOString());
        setData(result);
      } catch (err) {
        console.error("[TeamMetrics] refetch falhou:", err);
      }
    });
  }

  function switchMode(next: PeriodMode) {
    const nextWeekOffset = next === "semana" ? -1 : weekOffset;
    const nextMonthOffset = next === "mes" ? -1 : monthOffset;
    setMode(next);
    if (next === "semana") setWeekOffset(-1);
    if (next === "mes") setMonthOffset(-1);
    const p = computePeriod(next, nextWeekOffset, nextMonthOffset);
    refetch(p.start, p.end);
  }

  function navigateWeek(dir: -1 | 1) {
    const next = weekOffset + dir;
    setWeekOffset(next);
    const p = computePeriod("semana", next, monthOffset);
    refetch(p.start, p.end);
  }

  function navigateMonth(dir: -1 | 1) {
    const next = monthOffset + dir;
    setMonthOffset(next);
    const p = computePeriod("mes", weekOffset, next);
    refetch(p.start, p.end);
  }

  const { global: g, members } = data;

  return (
    <div className={cn("transition-opacity", isPending && "opacity-50")}>
      {/* Period selector */}
      <div className="border-b border-border px-4 py-4 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-px border border-border bg-border">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => switchMode(m.key)}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors",
                  mode === m.key
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "semana" && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateWeek(-1)}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-[160px] text-center text-[12px] tabular-nums text-muted-foreground">
                {getPeriodLabel()}
              </span>
              <button
                onClick={() => navigateWeek(1)}
                disabled={weekOffset >= -1}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Semana seguinte"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}

          {mode === "mes" && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth(-1)}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-[150px] text-center text-[12px] capitalize text-muted-foreground">
                {getPeriodLabel()}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                disabled={monthOffset >= -1}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Mês seguinte"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 p-4 md:p-8">
        {/* Global totals */}
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Totais da Equipa
          </p>
          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
            <StatCell label="Tarefas Criadas" value={g.tarefas_criadas} />
            <StatCell label="Realizadas" value={g.tarefas_realizadas} />
            <StatCell
              label="Em Atraso"
              value={g.tarefas_em_atraso}
              highlight={g.tarefas_em_atraso > 0}
            />
            <StatCell label="H. Realizadas" value={fmtMinutes(g.horas_realizadas_minutos)} />
            <StatCell label="H. Estimadas" value={fmtEstimated(g.horas_estimadas)} />
          </div>
        </div>

        {/* Per-member table */}
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Por Pessoa
          </p>
          <div className="border border-border bg-card">
            {/* Header */}
            <div className="grid grid-cols-[1fr_repeat(5,_80px)] gap-px border-b border-border bg-border text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:grid-cols-[1fr_repeat(5,_100px)]">
              <div className="bg-card px-4 py-2.5">Membro</div>
              <div className="bg-card px-2 py-2.5 text-right">Criadas</div>
              <div className="bg-card px-2 py-2.5 text-right">Realizadas</div>
              <div className="bg-card px-2 py-2.5 text-right">Em Atraso</div>
              <div className="bg-card px-2 py-2.5 text-right">H. Real.</div>
              <div className="bg-card px-2 py-2.5 text-right">H. Est.</div>
            </div>

            {members.length === 0 ? (
              <p className="px-4 py-6 text-sm font-light text-muted-foreground">
                Sem membros activos.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {members.map((m) => (
                  <li
                    key={m.member_id}
                    className="grid grid-cols-[1fr_repeat(5,_80px)] gap-px bg-border sm:grid-cols-[1fr_repeat(5,_100px)]"
                  >
                    <div className="bg-card px-4 py-3">
                      <span className="text-sm font-medium tracking-[-0.01em]">{m.full_name}</span>
                    </div>
                    <div className="bg-card px-2 py-3 text-right text-sm tabular-nums font-light">
                      {m.tarefas_criadas > 0 ? m.tarefas_criadas : <span className="text-muted-foreground/40">—</span>}
                    </div>
                    <div className="bg-card px-2 py-3 text-right text-sm tabular-nums font-light">
                      {m.tarefas_realizadas > 0 ? m.tarefas_realizadas : <span className="text-muted-foreground/40">—</span>}
                    </div>
                    <div
                      className={cn(
                        "bg-card px-2 py-3 text-right text-sm tabular-nums font-light",
                        m.tarefas_em_atraso > 0 && "font-medium text-red-500",
                      )}
                    >
                      {m.tarefas_em_atraso > 0 ? m.tarefas_em_atraso : <span className="text-muted-foreground/40">—</span>}
                    </div>
                    <div className="bg-card px-2 py-3 text-right text-sm tabular-nums font-light">
                      {m.horas_realizadas_minutos > 0 ? (
                        fmtMinutes(m.horas_realizadas_minutos)
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </div>
                    <div className="bg-card px-2 py-3 text-right text-sm tabular-nums font-light">
                      {m.horas_estimadas > 0 ? (
                        fmtEstimated(m.horas_estimadas)
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground/50">
              Em Atraso reflecte o estado actual (tarefas com prazo vencido e não concluídas).
              H. Estimadas = soma de horas estimadas nas tarefas concluídas no período.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
