"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { fetchTeamWeeklyHoursAction, fetchMemberLogsAction } from "@/lib/actions/team-hours";
import type { TeamMemberHours, TimeLogWithTask } from "@/lib/queries/dashboard-colaborador";
import { getWeekStart } from "@/lib/utils/week-utils";
import { MemberHoursReadonly } from "@/components/dashboard/member-hours-readonly";

interface TeamHoursProps {
  initialData: TeamMemberHours[];
  initialWeekStart: Date;
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

export function TeamHours({ initialData, initialWeekStart }: TeamHoursProps) {
  const [weekStart, setWeekStart] = useState<Date>(initialWeekStart);
  const [data, setData] = useState<TeamMemberHours[]>(initialData);
  const [isPending, startTransition] = useTransition();
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [memberLogs, setMemberLogs] = useState<Record<string, { recentLogs: TimeLogWithTask[]; runningLog: TimeLogWithTask | null }>>({});

  const currentWeekStart = getWeekStart();
  const isCurrentWeek = isSameWeek(weekStart, currentWeekStart);

  function navigate(direction: -1 | 1) {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + direction * 7);
    setWeekStart(next);
    startTransition(async () => {
      const result = await fetchTeamWeeklyHoursAction(next.toISOString());
      setData(result);
    });
  }

  function goToCurrentWeek() {
    setWeekStart(currentWeekStart);
    startTransition(async () => {
      const result = await fetchTeamWeeklyHoursAction(currentWeekStart.toISOString());
      setData(result);
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

  return (
    <div>
      {/* Cabeçalho */}
      <div className="border-b border-border pb-3 flex items-center justify-between gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Horas da Equipa
        </h2>
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

      {/* Tabela */}
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
    </div>
  );
}
