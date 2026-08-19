"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { fetchTeamWeeklyHoursAction, fetchMemberLogsAction } from "@/lib/actions/team-hours";
import { fetchTeamMetricsAction } from "@/lib/actions/team-metrics";
import type { TeamMemberHours, TimeLogWithTask } from "@/lib/queries/dashboard-colaborador";
import type { TeamMetricsResult, OverdueTask } from "@/lib/queries/team-metrics";
import { getWeekStart } from "@/lib/utils/week-utils";
import { MemberHoursReadonly } from "@/components/dashboard/member-hours-readonly";
import { OverdueTasksModal } from "@/components/team/overdue-tasks-modal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TeamHoursProps {
  initialData: TeamMemberHours[];
  initialWeekStart: Date;
  teamMetrics: TeamMetricsResult | null;
  overdueTasks: OverdueTask[];
}

function fmtMinutes(min: number): string {
  if (min === 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

function isSameWeek(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export function TeamHours({ initialData, initialWeekStart, teamMetrics, overdueTasks }: TeamHoursProps) {
  const [weekStart, setWeekStart] = useState<Date>(initialWeekStart);
  const [data, setData] = useState<TeamMemberHours[]>(initialData);
  const [isPending, startTransition] = useTransition();
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [memberLogs, setMemberLogs] = useState<Record<string, { recentLogs: TimeLogWithTask[]; runningLog: TimeLogWithTask | null }>>({});
  const [view, setView] = useState<"tabela" | "dashboard">("tabela");
  const [overdueOpen, setOverdueOpen] = useState(false);
  const [metricsData, setMetricsData] = useState(teamMetrics);

  const currentWeekStart = getWeekStart();
  const isCurrentWeek = isSameWeek(weekStart, currentWeekStart);

  function navigate(direction: -1 | 1) {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + direction * 7);
    const weekEnd = new Date(next);
    weekEnd.setDate(next.getDate() + 7);
    setWeekStart(next);
    startTransition(async () => {
      const [hours, metrics] = await Promise.all([
        fetchTeamWeeklyHoursAction(next.toISOString()),
        fetchTeamMetricsAction(next.toISOString(), weekEnd.toISOString()),
      ]);
      setData(hours);
      setMetricsData(metrics);
    });
  }

  function goToCurrentWeek() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 7);
    setWeekStart(currentWeekStart);
    startTransition(async () => {
      const [hours, metrics] = await Promise.all([
        fetchTeamWeeklyHoursAction(currentWeekStart.toISOString()),
        fetchTeamMetricsAction(currentWeekStart.toISOString(), weekEnd.toISOString()),
      ]);
      setData(hours);
      setMetricsData(metrics);
    });
  }

  function toggleMember(memberId: string) {
    if (expandedMemberId === memberId) {
      setExpandedMemberId(null);
      return;
    }
    setExpandedMemberId(memberId);
    if (!memberLogs[memberId]) {
      startTransition(async () => {
        const result = await fetchMemberLogsAction(memberId);
        setMemberLogs((prev) => ({ ...prev, [memberId]: result }));
      });
    }
  }

  const totalWeekMinutes = data.reduce((s, m) => s + m.week_minutes, 0);

  const g = metricsData?.global ?? null;
  const taxa =
    g && g.tarefas_criadas > 0
      ? ((g.tarefas_realizadas / g.tarefas_criadas) * 100).toFixed(0) + "%"
      : "—";

  const chartData = data
    .filter((m) => m.week_minutes > 0)
    .map((m) => ({
      name: m.full_name.split(" ")[0],
      horas: parseFloat((m.week_minutes / 60).toFixed(1)),
      label: fmtMinutes(m.week_minutes),
    }));
  const chartHeight = Math.max(150, chartData.length * 44);

  return (
    <div>
      {/* Cabeçalho */}
      <div className="border-b border-border pb-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Horas da Equipa
          </h2>
          <div className="flex gap-px border border-border bg-border">
            {(["tabela", "dashboard"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors ${
                  view === v
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {v === "tabela" ? "Tabela" : "Dashboard"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentWeek && (
            <button
              onClick={goToCurrentWeek}
              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
            >
              esta semana
            </button>
          )}
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-[11px] tabular-nums text-muted-foreground min-w-[130px] text-center">
            {isCurrentWeek ? "esta semana" : fmtWeekLabel(weekStart)}
          </span>
          <button
            onClick={() => navigate(1)}
            disabled={isCurrentWeek}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Semana seguinte"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Vista Tabela */}
      {view === "tabela" && (
        <div className={`transition-opacity ${isPending ? "opacity-40" : "opacity-100"}`}>
          {data.length === 0 ? (
            <p className="py-6 text-sm font-light text-muted-foreground">
              Sem registos de horas para esta semana.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {data.map((m) => (
                  <li key={m.member_id}>
                    <div
                      className="flex items-baseline justify-between gap-4 py-3 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded"
                      onClick={() => toggleMember(m.member_id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {expandedMemberId === m.member_id ? (
                          <ChevronUp className="size-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium tracking-[-0.01em] truncate">
                          {m.full_name}
                        </span>
                        {m.has_running && (
                          <span className="size-1.5 rounded-full bg-green-500 shrink-0" title="Temporizador activo" />
                        )}
                      </div>
                      <div className="flex items-baseline gap-4 shrink-0">
                        {isCurrentWeek && (
                          <span className="text-[11px] tabular-nums text-muted-foreground/50 w-16 text-right">
                            {m.today_minutes > 0 ? `hoje ${fmtMinutes(m.today_minutes)}` : ""}
                          </span>
                        )}
                        <span className={`text-sm tabular-nums font-light w-16 text-right ${m.week_minutes === 0 ? "text-muted-foreground/40" : ""}`}>
                          {fmtMinutes(m.week_minutes)}
                        </span>
                      </div>
                    </div>
                    {expandedMemberId === m.member_id && (
                      <div className="pb-3 pl-4">
                        {isPending && !memberLogs[m.member_id] ? (
                          <p className="text-xs text-muted-foreground">A carregar...</p>
                        ) : memberLogs[m.member_id] ? (
                          <MemberHoursReadonly
                            recentLogs={memberLogs[m.member_id].recentLogs}
                            runningLog={memberLogs[m.member_id].runningLog}
                            memberName={m.full_name}
                          />
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {/* Total */}
              <div className="flex justify-between items-baseline pt-3 border-t border-border mt-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Total equipa
                </span>
                <span className="text-sm tabular-nums font-medium">
                  {fmtMinutes(totalWeekMinutes)}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Vista Dashboard */}
      {view === "dashboard" && (
        <div className={`transition-opacity pt-4 ${isPending ? "opacity-40" : "opacity-100"}`}>
          {/* Cards de tarefas */}
          {g && (
            <div className="grid grid-cols-3 gap-px border border-border bg-border mb-5">
              <div className="bg-card px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Realizadas
                </p>
                <p className="text-[28px] font-light leading-none tracking-[-0.03em] tabular-nums text-emerald-500">
                  {g.tarefas_realizadas}
                </p>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOverdueOpen(true)}
                onKeyDown={(e) => e.key === "Enter" && setOverdueOpen(true)}
                className="bg-card px-4 py-3 cursor-pointer outline-none ring-inset focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/30 transition-colors"
                aria-label={`Ver ${g.tarefas_em_atraso} tarefas em atraso`}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Em Atraso
                </p>
                <p
                  className={`text-[28px] font-light leading-none tracking-[-0.03em] tabular-nums ${g.tarefas_em_atraso > 0 ? "text-[#A12B2B]" : ""}`}
                >
                  {g.tarefas_em_atraso}
                </p>
              </div>
              <div className="bg-card px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Taxa de Conclusão
                </p>
                <p className="text-[28px] font-light leading-none tracking-[-0.03em] tabular-nums">
                  {taxa}
                </p>
                {g && (
                  <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground/50">
                    {g.tarefas_realizadas} / {g.tarefas_criadas}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Gráfico de horas por membro */}
          {chartData.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-3 h-3 shrink-0" style={{ backgroundColor: "#6B7280" }} />
                <span className="text-[11px] text-muted-foreground">Horas esta semana</span>
              </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                barCategoryGap="35%"
              >
                <XAxis
                  type="number"
                  allowDecimals
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  unit="h"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={72}
                  tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                  formatter={(((_: unknown, __: unknown, props: any) => [props.payload.label, "Horas"]) as any)}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 0,
                    fontSize: 12,
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="horas" fill="#6B7280" radius={0} />
              </BarChart>
            </ResponsiveContainer>
            </>
          ) : (
            <p className="py-4 text-sm font-light text-muted-foreground">
              Sem registos de horas para esta semana.
            </p>
          )}
        </div>
      )}

      <OverdueTasksModal
        open={overdueOpen}
        onClose={() => setOverdueOpen(false)}
        tasks={overdueTasks}
      />
    </div>
  );
}
