"use client";

import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarX2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/lib/queries/tasks";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ExternalCalendarEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  color?: string;
  source: "google";
}

interface TasksCalendarProps {
  tasks: TaskWithRelations[];
  onTaskClick: (taskId: string) => void;
  externalEvents?: ExternalCalendarEvent[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PT_MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const MAX_VISIBLE = 3;

// Prioridade → cor de fundo e texto da pill
const PILL_BG: Record<string, string> = {
  urgente: "#ef4444",
  alta: "#f97316",
  media: "#3b82f6",
  baixa: "#6b7280",
  sem_prioridade: "#e5e7eb",
};

const PILL_TEXT: Record<string, string> = {
  urgente: "#fff",
  alta: "#fff",
  media: "#fff",
  baixa: "#fff",
  sem_prioridade: "#374151",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function parseDate(s: string): Date {
  // due_date é "YYYY-MM-DD" — parseISO trata correctamente como local date
  return parseISO(s);
}

// ─── Sub-componente: pill de tarefa ───────────────────────────────────────────

function TaskPill({
  task,
  onClick,
  compact = false,
}: {
  task: TaskWithRelations;
  onClick: () => void;
  compact?: boolean;
}) {
  const bg = PILL_BG[task.priority] ?? PILL_BG.sem_prioridade;
  const color = PILL_TEXT[task.priority] ?? PILL_TEXT.sem_prioridade;

  if (compact) {
    // Ecrã pequeno: ponto + título muito curto
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="flex items-center gap-1 w-full text-left"
        title={task.title}
      >
        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: bg }} />
        <span className="text-[10px] truncate text-foreground leading-none">{task.title}</span>
      </button>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full text-left rounded-[3px] px-1.5 py-0.5 text-[11px] leading-tight truncate transition-opacity hover:opacity-80"
      style={{ backgroundColor: bg, color }}
      title={task.title}
    >
      {task.title}
    </button>
  );
}

// ─── Sub-componente: evento externo (Google Calendar) ─────────────────────────

function ExternalEventPill({ event }: { event: ExternalCalendarEvent }) {
  return (
    <div
      className="w-full rounded-[3px] px-1.5 py-0.5 text-[11px] leading-tight truncate border border-dashed flex items-center gap-1"
      style={{
        borderColor: event.color ?? "#4285f4",
        color: event.color ?? "#4285f4",
        backgroundColor: `${event.color ?? "#4285f4"}15`,
      }}
      title={`${event.title} (Google Calendar)`}
    >
      <span className="text-[9px] font-bold shrink-0 opacity-70">G</span>
      <span className="truncate">{event.title}</span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TasksCalendar({
  tasks,
  onTaskClick,
  externalEvents = [],
}: TasksCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [noDateExpanded, setNoDateExpanded] = useState(false);
  const [dialogDate, setDialogDate] = useState<string | null>(null);

  // Só tarefas raiz (sem parent_task_id)
  const rootTasks = useMemo(
    () => tasks.filter((t) => !(t as any).parent_task_id),
    [tasks],
  );

  // Sem data
  const tasksWithoutDate = useMemo(
    () => rootTasks.filter((t) => !t.due_date),
    [rootTasks],
  );

  // Agrupadas por data
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const task of rootTasks) {
      if (!task.due_date) continue;
      const key = task.due_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [rootTasks]);

  // Eventos externos agrupados por data
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ExternalCalendarEvent[]>();
    for (const ev of externalEvents) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [externalEvents]);

  // Dias do grid do calendário
  const calDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Tarefas do dia seleccionado no dialog
  const dialogTasks = dialogDate ? (tasksByDate.get(dialogDate) ?? []) : [];
  const dialogEvents = dialogDate ? (eventsByDate.get(dialogDate) ?? []) : [];
  const dialogLabel = dialogDate
    ? format(parseDate(dialogDate), "d 'de' MMMM")
        .replace("January","Janeiro").replace("February","Fevereiro")
        .replace("March","Março").replace("April","Abril")
        .replace("May","Maio").replace("June","Junho")
        .replace("July","Julho").replace("August","Agosto")
        .replace("September","Setembro").replace("October","Outubro")
        .replace("November","Novembro").replace("December","Dezembro")
    : "";

  const monthLabel = `${PT_MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Secção "Sem data" ─────────────────────────────────────────────── */}
      {tasksWithoutDate.length > 0 && (
        <div className="border-b px-6 py-2 bg-muted/20">
          <button
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setNoDateExpanded((v) => !v)}
          >
            {noDateExpanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            <CalendarX2 className="size-3.5" />
            Sem data definida ({tasksWithoutDate.length})
          </button>
          {noDateExpanded && (
            <div className="mt-2 flex flex-wrap gap-1.5 pb-1">
              {tasksWithoutDate.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  className="rounded-[3px] px-2 py-0.5 text-[11px] leading-tight transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: PILL_BG[task.priority] ?? PILL_BG.sem_prioridade,
                    color: PILL_TEXT[task.priority] ?? PILL_TEXT.sem_prioridade,
                  }}
                >
                  {task.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Navegação ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <h2 className="text-sm font-semibold">{monthLabel}</h2>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setCurrentMonth(new Date())}
        >
          Hoje
        </Button>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b bg-muted/20 sticky top-0 z-10">
          {WEEK_DAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Células dos dias */}
        <div className="grid grid-cols-7 flex-1">
          {calDays.map((day) => {
            const key = dateKey(day);
            const dayTasks = tasksByDate.get(key) ?? [];
            const dayEvents = eventsByDate.get(key) ?? [];
            const allItems = dayTasks.length + dayEvents.length;
            const visibleTasks = dayTasks.slice(0, MAX_VISIBLE);
            const hiddenCount = allItems - visibleTasks.length;
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[110px] border-b border-r p-1.5 flex flex-col gap-0.5",
                  !inMonth && "bg-muted/10",
                )}
              >
                {/* Número do dia */}
                <div className="flex justify-end mb-0.5">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center size-6 text-xs font-medium rounded-full leading-none cursor-default",
                      today
                        ? "bg-[#A12B2B] text-white"
                        : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Tarefas — desktop: pill colorida; mobile: ponto + título */}
                <div className="space-y-0.5 flex-1">
                  {visibleTasks.map((task) => (
                    <div key={task.id}>
                      {/* Desktop */}
                      <div className="hidden sm:block">
                        <TaskPill task={task} onClick={() => onTaskClick(task.id)} />
                      </div>
                      {/* Mobile */}
                      <div className="block sm:hidden">
                        <TaskPill task={task} onClick={() => onTaskClick(task.id)} compact />
                      </div>
                    </div>
                  ))}

                  {/* Eventos externos (Google Calendar) */}
                  {dayEvents.slice(0, Math.max(0, MAX_VISIBLE - visibleTasks.length)).map((ev) => (
                    <ExternalEventPill key={ev.id} event={ev} />
                  ))}

                  {/* "+ X mais" */}
                  {hiddenCount > 0 && (
                    <button
                      onClick={() => setDialogDate(key)}
                      className="w-full text-left text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1 leading-tight"
                    >
                      +{hiddenCount} mais
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dialog: todas as tarefas de um dia ────────────────────────────── */}
      <Dialog open={!!dialogDate} onOpenChange={(v) => { if (!v) setDialogDate(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{dialogLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {dialogTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => { onTaskClick(task.id); setDialogDate(null); }}
                className="w-full text-left rounded-[3px] px-3 py-2 text-sm transition-opacity hover:opacity-80 flex items-center gap-2"
                style={{
                  backgroundColor: PILL_BG[task.priority] ?? PILL_BG.sem_prioridade,
                  color: PILL_TEXT[task.priority] ?? PILL_TEXT.sem_prioridade,
                }}
              >
                <span className="flex-1 truncate">{task.title}</span>
                {task.estimate_points && (
                  <span className="text-[10px] shrink-0 opacity-70">
                    {task.estimate_points}h
                  </span>
                )}
              </button>
            ))}
            {dialogEvents.map((ev) => (
              <div key={ev.id} className="w-full rounded-[3px] px-3 py-2 text-sm border border-dashed flex items-center gap-2"
                style={{ borderColor: ev.color ?? "#4285f4", color: ev.color ?? "#4285f4" }}>
                <span className="text-[10px] font-bold shrink-0">G</span>
                <span className="truncate">{ev.title}</span>
              </div>
            ))}
            {dialogTasks.length === 0 && dialogEvents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sem tarefas</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
