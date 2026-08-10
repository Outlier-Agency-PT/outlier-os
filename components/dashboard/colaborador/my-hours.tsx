"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Plus, ChevronDown, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  startTimerAction,
  stopTimerAction,
  logTimeManualAction,
  fetchMyOpenTasksAction,
  fetchMyAllTasksAction,
  markTaskCompleteAction,
  updateTimeLogAction,
  deleteTimeLogAction,
} from "@/lib/actions/tasks";
import { getRecentLogsAction } from "@/lib/actions/time-logs";
import { cn, formatDuration } from "@/lib/utils";
import { toast } from "sonner";
import type { TimeLogWithTask } from "@/lib/queries/dashboard-colaborador";
import { PRIORITY_COLORS, type TaskPriority } from "@/lib/types";

export interface SimpleTask {
  id: string;
  title: string;
  priority?: TaskPriority;
  completed_at?: string | null;
  estimate_points?: number | null;
}

interface Props {
  todayMinutes: number;
  runningLog: TimeLogWithTask | null;
  recentLogs: TimeLogWithTask[];
  myDayTasks: SimpleTask[];
  onNewTask: () => void;
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

function timeStr(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function calcDurationMins(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  return endMins - startMins;
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

export function MyHours({ todayMinutes, runningLog, recentLogs: initialLogs, myDayTasks, onNewTask }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLogPending, startLogTransition] = useTransition();
  const [recentLogs, setRecentLogs] = useState<TimeLogWithTask[]>(initialLogs);

  // Timer
  const [timerTasks, setTimerTasks] = useState<SimpleTask[]>(myDayTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(myDayTasks[0]?.id ?? "");
  const [elapsed, setElapsed] = useState(0);

  // Mark complete dialog
  const [completeDialog, setCompleteDialog] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [isCompletePending, startCompleteTransition] = useTransition();

  // Week sections: current week expanded, others collapsed
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(() => new Set([getWeekStartStr(todayISO())]));
  // Day sections: today starts expanded, others collapsed
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set([todayISO()]));
  // Individual log expansion (to show description)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());


  // Inline edit
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editLogDate, setEditLogDate] = useState("");
  const [isEditPending, startEditTransition] = useTransition();

  // Delete confirmation
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  // Manual log dialog
  const [logOpen, setLogOpen] = useState(false);
  const [allTasks, setAllTasks] = useState<SimpleTask[]>([]);
  const [logTaskId, setLogTaskId] = useState("");
  const [logStartTime, setLogStartTime] = useState(() => timeStr(new Date(Date.now() - 3600000)));
  const [logEndTime, setLogEndTime] = useState(() => timeStr(new Date()));
  const [logDate, setLogDate] = useState(todayISO());
  const [logDesc, setLogDesc] = useState("");

  // Fetch fresh open tasks for timer on mount
  useEffect(() => {
    fetchMyOpenTasksAction()
      .then((res) => {
        setTimerTasks(res.data);
        setSelectedTaskId((prev) => {
          const ids = new Set(res.data.map((t) => t.id));
          return ids.has(prev) ? prev : (res.data[0]?.id ?? "");
        });
      })
      .catch(() => {});
  }, []);

  // Fetch all tasks when log dialog opens or inline edit starts
  useEffect(() => {
    if (!logOpen && !editingLogId) return;
    if (allTasks.length > 0) return;
    fetchMyAllTasksAction().then((res) => {
      if (res.data.length > 0) setAllTasks(res.data);
    });
  }, [logOpen, editingLogId]);


  // Elapsed ticker
  useEffect(() => {
    if (!runningLog) return;
    const start = new Date(runningLog.start_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 60000));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [runningLog]);

  // Sincroniza com TodayTasks: remove tarefa concluída do dropdown do timer
  // e actualiza a lista de logs sem depender do router.refresh()
  useEffect(() => {
    function handleTaskCompleted(e: Event) {
      const { taskId } = (e as CustomEvent<{ taskId: string }>).detail;
      setTimerTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTaskId((prev) => (prev === taskId ? "" : prev));
      getRecentLogsAction().then((fresh) => setRecentLogs(fresh)).catch(() => {});
    }
    window.addEventListener("outlier:task-completed", handleTaskCompleted);
    return () => window.removeEventListener("outlier:task-completed", handleTaskCompleted);
  }, []);

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

  function toggleLog(logId: string) {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }

  function handleStart() {
    if (!selectedTaskId) { toast.error("Escolhe uma tarefa"); return; }
    startTransition(async () => {
      const result = await startTimerAction(selectedTaskId);
      if ("error" in result && result.error) { toast.error("Erro ao iniciar timer"); return; }
      router.refresh();
    });
  }

  function handleStop() {
    if (!runningLog) return;
    const taskId = runningLog.task?.id;
    const taskTitle = runningLog.task?.title;
    startTransition(async () => {
      const result = await stopTimerAction(runningLog.id);
      if ("error" in result && result.error) { toast.error("Erro ao parar timer"); return; }
      toast.success(`Tempo registado: ${formatDuration(result.durationMinutes ?? 0)}`);
      router.refresh();
      if (taskId && taskTitle) setCompleteDialog({ taskId, taskTitle });
    });
  }

  function resetLogForm() {
    setLogTaskId("");
    setLogStartTime(timeStr(new Date(Date.now() - 3600000)));
    setLogEndTime(timeStr(new Date()));
    setLogDate(todayISO());
    setLogDesc("");
  }

  function handleLogTime() {
    const durationMins = calcDurationMins(logStartTime, logEndTime);
    if (!logTaskId) { toast.error("Escolhe uma tarefa"); return; }
    if (durationMins === 0) { toast.error("A duração tem de ser maior que 0"); return; }
    startLogTransition(async () => {
      const result = await logTimeManualAction(logTaskId, durationMins, logDesc || undefined, logDate, logStartTime, logEndTime);
      if ("error" in result && result.error) { toast.error("Erro ao registar tempo"); return; }
      toast.success("Tempo registado");
      const doneTask = allTasks.find((t) => t.id === logTaskId);
      setLogOpen(false);
      resetLogForm();
      router.refresh();
      if (doneTask) setCompleteDialog({ taskId: doneTask.id, taskTitle: doneTask.title });
    });
  }

  function startEditLog(log: TimeLogWithTask) {
    setEditingLogId(log.id);
    setEditTaskId(log.task?.id ?? "");
    setEditStartTime(fmtTime(log.start_at));
    setEditEndTime(log.end_at ? fmtTime(log.end_at) : "");
    setEditLogDate(getLocalDateStr(log.start_at));
    setDeletingLogId(null);
  }

  function cancelEdit() {
    setEditingLogId(null);
  }

  function handleSaveEdit() {
    if (!editingLogId || !editTaskId) { toast.error("Escolhe uma tarefa"); return; }
    const dur = calcDurationMins(editStartTime, editEndTime);
    if (dur === 0) { toast.error("A duração tem de ser maior que 0"); return; }
    startEditTransition(async () => {
      const result = await updateTimeLogAction(editingLogId, editTaskId, editLogDate, editStartTime, editEndTime);
      if ("error" in result && result.error) { toast.error("Erro ao actualizar registo"); return; }
      toast.success("Registo actualizado");
      setEditingLogId(null);
      router.refresh();
    });
  }

  function handleDeleteLog(logId: string) {
    startDeleteTransition(async () => {
      const result = await deleteTimeLogAction(logId);
      if ("error" in result && result.error) { toast.error("Erro ao apagar registo"); return; }
      toast.success("Registo apagado");
      setDeletingLogId(null);
      router.refresh();
    });
  }

  const weekGroups = groupLogsByWeek(recentLogs);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          As Minhas Horas
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onNewTask}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/65 transition-colors hover:text-foreground"
          >
            <Plus className="size-3" />
            Nova tarefa
          </button>
          <button
            onClick={() => setLogOpen(true)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/65 transition-colors hover:text-foreground"
          >
            <Plus className="size-3" />
            Registar tempo
          </button>
          <span className="text-[11px] tabular-nums text-muted-foreground/65">
            {formatDuration(todayMinutes + (runningLog ? elapsed : 0))} hoje
          </span>
        </div>
      </div>

      {/* Timer */}
      <div className="flex flex-wrap items-center gap-2 py-4">
        {runningLog ? (
          <Button size="sm" variant="destructive" onClick={handleStop} disabled={isPending}>
            <Square className="size-3.5" />
            Parar {runningLog.task ? `· ${runningLog.task.title}` : ""} ({formatDuration(elapsed)})
          </Button>
        ) : (
          <>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger className="h-8 w-56 text-xs">
                <SelectValue placeholder="Escolhe uma tarefa" />
              </SelectTrigger>
              <SelectContent>
                {timerTasks.map((task) => {
                  const est = fmtEstimate(task.estimate_points);
                  const prioColor = PRIORITY_COLORS[task.priority ?? "sem_prioridade"];
                  return (
                    <SelectItem key={task.id} value={task.id}>
                      <span className="flex items-center gap-1.5">
                        <span className={cn("size-2 shrink-0 rounded-full bg-current", prioColor)} />
                        {task.title}{est ? `  · ${est}` : ""}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleStart} disabled={isPending || !selectedTaskId}>
              <Play className="size-3.5" />
              Iniciar timer
            </Button>
          </>
        )}
      </div>

      {/* Logs agrupados por semana → dia */}
      {weekGroups.length === 0 ? (
        <p className="pb-4 text-sm font-light text-muted-foreground">Sem registos de tempo ainda.</p>
      ) : (
        <div>
          {weekGroups.map(({ weekStart, label: weekLabel, totalMins: weekMins, days }) => {
            const isWeekExpanded = expandedWeeks.has(weekStart);
            return (
              <div key={weekStart} className="border-t border-border">
                {/* Cabeçalho da semana */}
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
                      const taskDesc = log.task?.description?.trim() ?? "";
                      const hasDesc = !!taskDesc;
                      const isLogExpanded = expandedLogs.has(log.id);
                      const isEditing = editingLogId === log.id;
                      const isDeleting = deletingLogId === log.id;
                      const isRunning = !log.end_at;

                      if (isEditing) {
                        return (
                          <li key={log.id} className="py-2 pl-4 pr-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Select value={editTaskId} onValueChange={setEditTaskId}>
                                <SelectTrigger className="h-7 min-w-0 flex-1 text-xs">
                                  <SelectValue placeholder="Tarefa" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allTasks.map((task) => {
                                    const prioColor = PRIORITY_COLORS[task.priority ?? "sem_prioridade"];
                                    const name = task.title.length > 40 ? task.title.slice(0, 40).trimEnd() + "…" : task.title;
                                    return (
                                      <SelectItem key={task.id} value={task.id}>
                                        <span className="flex items-center gap-1.5">
                                          <span className={cn("size-2 shrink-0 rounded-full bg-current", prioColor)} />
                                          {name}
                                        </span>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <Input type="time" className="h-7 w-24 text-xs" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} />
                              <span className="text-muted-foreground">→</span>
                              <Input type="time" className="h-7 w-24 text-xs" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
                              {calcDurationMins(editStartTime, editEndTime) > 0 && (
                                <span className="text-[11px] text-muted-foreground">{fmtDur(calcDurationMins(editStartTime, editEndTime))}</span>
                              )}
                              <button
                                onClick={handleSaveEdit}
                                disabled={isEditPending}
                                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                              >
                                <Check className="size-3.5" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      }

                      if (isDeleting) {
                        return (
                          <li key={log.id} className="flex items-center justify-between gap-4 py-2 pl-4 pr-1">
                            <span className="text-[11px] text-muted-foreground">Tens a certeza?</span>
                            <span className="flex items-center gap-2">
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                disabled={isDeletePending}
                                className="text-[11px] font-medium text-destructive transition-colors hover:text-destructive/80 disabled:opacity-50"
                              >
                                Apagar
                              </button>
                              <button
                                onClick={() => setDeletingLogId(null)}
                                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                              >
                                Cancelar
                              </button>
                            </span>
                          </li>
                        );
                      }

                      return (
                        <li key={log.id} className="group">
                          <div
                            className={cn(
                              "flex w-full items-center justify-between gap-4 py-2 text-left",
                            )}
                          >
                            <button
                              className={cn(
                                "min-w-0 flex-1 truncate pl-4 text-sm font-medium tracking-[-0.01em] text-left",
                                hasDesc ? "cursor-pointer" : "cursor-default",
                              )}
                              onClick={() => hasDesc && toggleLog(log.id)}
                            >
                              <span className="flex items-baseline gap-1.5 truncate">
                {log.task?.title ?? "—"}
                {log.task?.estimate_points != null && (
                  <span className="shrink-0 text-xs font-normal text-muted-foreground">
                    Estimativa: {fmtEstimate(log.task.estimate_points)}
                  </span>
                )}
              </span>
                            </button>
                            <span className="flex shrink-0 items-center gap-1.5">
                              <span className="text-[11px] tabular-nums text-muted-foreground">
                                {log.end_at
                                  ? `${fmtTime(log.start_at)} — ${fmtTime(log.end_at)} · ${fmtDur(log.duration_minutes ?? 0)}`
                                  : "A correr..."}
                              </span>
                              {hasDesc && (
                                <ChevronDown
                                  className={cn(
                                    "size-3 text-muted-foreground/50 transition-transform duration-150",
                                    !isLogExpanded && "-rotate-90",
                                  )}
                                />
                              )}
                              {!isRunning && (
                                <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    onClick={() => startEditLog(log)}
                                    className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-foreground"
                                    title="Editar"
                                  >
                                    <Pencil className="size-3" />
                                  </button>
                                  <button
                                    onClick={() => { setDeletingLogId(log.id); setEditingLogId(null); }}
                                    className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-destructive"
                                    title="Apagar"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </span>
                              )}
                            </span>
                          </div>
                          {hasDesc && isLogExpanded && (
                            <p className="pb-2 pl-4 pr-6 text-xs text-muted-foreground">
                              {taskDesc}
                            </p>
                          )}
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


      {/* Mark complete dialog */}
      <Dialog open={!!completeDialog} onOpenChange={(open) => { if (!open) setCompleteDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Marcar como concluída?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Marcar a tarefa{" "}
            <span className="font-medium text-foreground">"{completeDialog?.taskTitle}"</span>{" "}
            como concluída?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(null)}>Não</Button>
            <Button
              disabled={isCompletePending}
              onClick={() => {
                if (!completeDialog) return;
                startCompleteTransition(async () => {
                  const result = await markTaskCompleteAction(completeDialog.taskId);
                  if ("error" in result && result.error) {
                    toast.error("Erro ao concluir tarefa");
                  } else {
                    toast.success("Tarefa marcada como concluída");
                    router.refresh();
                  }
                  setCompleteDialog(null);
                });
              }}
            >
              Sim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual log dialog */}
      <Dialog open={logOpen} onOpenChange={(open) => { setLogOpen(open); if (!open) resetLogForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registar tempo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tarefa</Label>
              <Select value={logTaskId} onValueChange={setLogTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolhe uma tarefa" />
                </SelectTrigger>
                <SelectContent>
                  {allTasks.map((task) => {
                    const est = fmtEstimate(task.estimate_points);
                    const name = task.title.length > 40 ? task.title.slice(0, 40).trimEnd() + "…" : task.title;
                    const prioColor = PRIORITY_COLORS[task.priority ?? "sem_prioridade"];
                    return (
                      <SelectItem key={task.id} value={task.id} className="max-w-sm">
                        <span className="flex items-center gap-1.5">
                          <span className={cn("size-2 shrink-0 rounded-full bg-current", prioColor)} />
                          <span className="truncate">{name}{est ? `  · ${est}` : ""}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Período</Label>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Início</span>
                  <Input type="time" className="w-28" value={logStartTime} onChange={(e) => setLogStartTime(e.target.value)} />
                </div>
                <span className="mt-5 text-muted-foreground">→</span>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Fim</span>
                  <Input type="time" className="w-28" value={logEndTime} onChange={(e) => setLogEndTime(e.target.value)} />
                </div>
                {calcDurationMins(logStartTime, logEndTime) > 0 && (
                  <span className="mt-5 text-sm text-muted-foreground">
                    = {fmtDur(calcDurationMins(logStartTime, logEndTime))}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="log-date">Data</Label>
              <Input id="log-date" type="date" value={logDate} max={todayISO()} onChange={(e) => setLogDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="log-desc">
                Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea id="log-desc" placeholder="Em que trabalhaste?" rows={2} value={logDesc} onChange={(e) => setLogDesc(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancelar</Button>
            <Button onClick={handleLogTime} disabled={isLogPending}>Registar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
