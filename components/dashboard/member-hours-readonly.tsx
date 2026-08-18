"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeLogWithTask } from "@/lib/queries/dashboard-colaborador";

export interface MemberHoursReadonlyProps {
  recentLogs: TimeLogWithTask[];
  runningLog: TimeLogWithTask | null;
  memberName: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function getLocalDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateLabel(dateStr: string): string {
  const today = todayISO();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return "Hoje";
  if (dateStr === yesterday) return "Ontem";
  const d = new Date(dateStr + "T12:00:00");
  const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

function groupLogsByDate(logs: TimeLogWithTask[]) {
  const groups = new Map<string, { label: string; totalMins: number; logs: TimeLogWithTask[] }>();
  for (const log of logs) {
    const dateStr = getLocalDateStr(log.start_at);
    if (!groups.has(dateStr)) {
      groups.set(dateStr, { label: getDateLabel(dateStr), totalMins: 0, logs: [] });
    }
    const g = groups.get(dateStr)!;
    g.logs.push(log);
    g.totalMins += log.duration_minutes ?? 0;
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, g]) => ({ date, ...g }));
}

function getWeekStartStr(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function getWeekLabel(weekStart: string): string {
  const todayWeek = getWeekStartStr(todayISO());
  if (weekStart === todayWeek) return "Esta semana";
  const lastWeekDate = new Date(todayWeek + "T12:00:00");
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeek = `${lastWeekDate.getFullYear()}-${String(lastWeekDate.getMonth() + 1).padStart(2, "0")}-${String(lastWeekDate.getDate()).padStart(2, "0")}`;
  if (weekStart === lastWeek) return "Semana passada";
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(weekStart + "T12:00:00");
  end.setDate(end.getDate() + 6);
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${months[start.getMonth()]}`;
  }
  return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]}`;
}

function groupLogsByWeek(logs: TimeLogWithTask[]) {
  const dayGroups = groupLogsByDate(logs);
  const weekMap = new Map<string, { label: string; totalMins: number; days: ReturnType<typeof groupLogsByDate> }>();
  for (const day of dayGroups) {
    const ws = getWeekStartStr(day.date);
    if (!weekMap.has(ws)) {
      weekMap.set(ws, { label: getWeekLabel(ws), totalMins: 0, days: [] });
    }
    const w = weekMap.get(ws)!;
    w.days.push(day);
    w.totalMins += day.totalMins;
  }
  return [...weekMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([weekStart, w]) => ({ weekStart, ...w }));
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDur(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function fmtEstimate(pts: number | null | undefined): string {
  if (pts == null) return "";
  const h = Math.floor(pts);
  const m = Math.round((pts % 1) * 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

export function MemberHoursReadonly({ recentLogs, runningLog, memberName }: MemberHoursReadonlyProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(
    () => new Set([getWeekStartStr(todayISO())])
  );
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    () => new Set([todayISO()])
  );

  function toggleWeek(ws: string) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(ws)) next.delete(ws);
      else next.add(ws);
      return next;
    });
  }

  function toggleDay(date: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const weekGroups = groupLogsByWeek(recentLogs);

  return (
    <div>
      {/* Temporizador activo */}
      {runningLog && (
        <div className="flex items-center gap-2 pb-3 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
          <span>
            A trabalhar em:{" "}
            <span className="font-medium text-foreground">
              {runningLog.task?.title ?? "Sem tarefa"}
            </span>{" "}
            (a decorrer)
          </span>
        </div>
      )}

      {/* Logs agrupados */}
      {weekGroups.length === 0 && !runningLog ? (
        <p className="py-2 text-xs text-muted-foreground">Sem registos de tempo para {memberName}.</p>
      ) : (
        <div>
          {weekGroups.map(({ weekStart, label: weekLabel, totalMins: weekMins, days }) => {
            const isWeekExpanded = expandedWeeks.has(weekStart);
            return (
              <div key={weekStart} className="border-t border-border">
                <button
                  onClick={() => toggleWeek(weekStart)}
                  className="flex w-full items-center justify-between py-2 text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <ChevronDown
                      className={cn(
                        "size-3 text-muted-foreground transition-transform duration-150",
                        !isWeekExpanded && "-rotate-90",
                      )}
                    />
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {weekLabel}
                    </span>
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground/60">
                    {fmtDur(weekMins)}
                  </span>
                </button>

                {isWeekExpanded && (
                  <div className="pl-4">
                    {days.map(({ date, label, totalMins, logs: dayLogs }) => {
                      const isExpanded = expandedDays.has(date);
                      return (
                        <div key={date} className="border-t border-border/50">
                          <button
                            onClick={() => toggleDay(date)}
                            className="flex w-full items-center justify-between py-1.5 text-left"
                          >
                            <span className="flex items-center gap-1.5">
                              <ChevronDown
                                className={cn(
                                  "size-3 text-muted-foreground/60 transition-transform duration-150",
                                  !isExpanded && "-rotate-90",
                                )}
                              />
                              <span className="text-[11px] font-medium uppercase tracking-[0.10em] text-muted-foreground/80">
                                {label}
                              </span>
                            </span>
                            <span className="text-[11px] tabular-nums text-muted-foreground/50">
                              {fmtDur(totalMins)}
                            </span>
                          </button>

                          {isExpanded && (
                            <ul className="pb-1">
                              {dayLogs.map((log) => {
                                const isRunning = !log.end_at;
                                const est = fmtEstimate(log.task?.estimate_points);
                                return (
                                  <li
                                    key={log.id}
                                    className="flex w-full items-center justify-between gap-4 py-2 pl-4"
                                  >
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium tracking-[-0.01em]">
                                      <span className="flex items-baseline gap-1.5 truncate">
                                        {log.task?.title ?? "—"}
                                        {est && (
                                          <span className="shrink-0 text-xs font-normal text-muted-foreground">
                                            Est. {est}
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                      {isRunning
                                        ? "a decorrer"
                                        : `${fmtTime(log.start_at)} – ${fmtTime(log.end_at!)} · ${fmtDur(log.duration_minutes ?? 0)}`}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
