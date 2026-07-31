"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  format,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  getISOWeek,
} from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTasksForGanttAction, updateTaskDatesAction } from "@/lib/actions/tasks";
import type { GanttTask } from "@/lib/queries/tasks";
import { toast } from "sonner";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PRIORITY_BAR: Record<string, string> = {
  urgente: "#ef4444",
  alta: "#f97316",
  media: "#3b82f6",
  baixa: "#6b7280",
  sem_prioridade: "#d1d5db",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  sem_prioridade: "Sem prioridade",
};

const LEFT_COL = 280;
const ROW_H = 40;
const HEADER_H = 48;

type Granularity = "semana" | "mes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// ─── Badge de dependências ────────────────────────────────────────────────────

function depTypeLabel(type: string): string {
  if (type === "blocks") return "Bloqueia";
  if (type === "blocked_by") return "Bloqueada por";
  return "Relacionada com";
}

function DependencyBadge({ dependencies }: { dependencies: GanttTask["dependencies"] }) {
  const [hovered, setHovered] = useState(false);
  if (!dependencies || dependencies.length === 0) return null;

  return (
    <div className="relative shrink-0">
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-accent transition-colors"
      >
        <Link2 className="size-2.5" />
        <span>{dependencies.length}</span>
      </button>
      {hovered && (
        <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1 whitespace-nowrap rounded bg-foreground px-2.5 py-1.5 text-[10px] text-background shadow-lg">
          {dependencies.map((dep, i) => (
            <p key={dep.id} className={i > 0 ? "mt-1" : ""}>
              <span className="opacity-60">{depTypeLabel(dep.type)}:</span>{" "}
              <span className="font-medium">{dep.title}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GanttSkeleton() {
  return (
    <div className="flex h-full animate-pulse">
      <div className="shrink-0 border-r" style={{ width: LEFT_COL }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-2.5">
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="flex-1 bg-muted/10" />
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function BarTooltip({ task }: { task: GanttTask }) {
  return (
    <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-1.5 whitespace-nowrap rounded bg-foreground px-2.5 py-1.5 text-[11px] text-background shadow-lg">
      <p className="font-semibold">{task.title}</p>
      <p className="mt-0.5 text-[10px] opacity-70">
        {task.start_date ?? "—"} → {task.due_date ?? "—"}
      </p>
      <p className="text-[10px] opacity-70">{PRIORITY_LABELS[task.priority]}</p>
    </div>
  );
}

// ─── Barra da tarefa (draggable) ──────────────────────────────────────────────

interface DraggableBarProps {
  task: GanttTask;
  days: Date[];
  colW: number;
  onTaskClick: (id: string) => void;
}

function DraggableGanttBar({ task, days, colW, onTaskClick }: DraggableBarProps) {
  const [hovered, setHovered] = useState(false);

  const firstDay = days[0];
  const totalDays = days.length;

  const startD = task.start_date ? parseISO(task.start_date) : null;
  const endD = task.due_date ? parseISO(task.due_date) : null;

  const color = PRIORITY_BAR[task.priority] ?? PRIORITY_BAR.sem_prioridade;

  const hasBothDates = !!startD && !!endD;
  const isDiamond = !startD && !!endD;
  const hasAnyBar = !!startD; // start_date present → renders as bar

  // Hooks always called (React rules); disabled when not applicable
  const bodyDrag = useDraggable({ id: `body::${task.id}`, disabled: !hasAnyBar });
  const leftDrag = useDraggable({ id: `left::${task.id}`, disabled: !hasBothDates });
  const rightDrag = useDraggable({ id: `right::${task.id}`, disabled: !hasBothDates });

  console.log('[BAR]', task.id.slice(0, 8), task.title, JSON.stringify({
    start_date: task.start_date,
    due_date: task.due_date,
    firstDay: days[0] ? format(days[0], 'yyyy-MM-dd') : 'UNDEFINED',
    totalDays: days.length,
    colW,
  }));

  if (!startD && !endD) return null;

  // ── Diamond (only due_date) ── no drag ──
  if (isDiamond) {
    const offset = differenceInCalendarDays(endD!, firstDay);
    if (offset < 0 || offset >= totalDays) return null;
    const left = offset * colW + colW / 2;
    return (
      <div className="relative h-full w-full overflow-hidden bg-transparent">
        <button
          onClick={() => onTaskClick(task.id)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          style={{ left }}
          title={task.title}
        >
          <div
            className="size-3 rotate-45 transition-transform hover:scale-125"
            style={{ backgroundColor: color }}
          />
          {hovered && <BarTooltip task={task} />}
        </button>
      </div>
    );
  }

  // ── Bar ──
  const effectiveStart = startD!;
  const effectiveEnd = endD ?? addDays(effectiveStart, 1);

  const startOffset = Math.max(0, differenceInCalendarDays(effectiveStart, firstDay));
  const endOffset = Math.min(totalDays, differenceInCalendarDays(effectiveEnd, firstDay) + 1);

  if (startOffset >= totalDays || endOffset <= 0) return null;

  const baseLeft = startOffset * colW;
  const baseWidth = Math.max(colW, (endOffset - startOffset) * colW);
  const barHeight = ROW_H - 14;

  // Visual state for resize handles (left/right change layout; body drag uses CSS transform)
  let visualLeft = baseLeft;
  let visualWidth = baseWidth;

  if (leftDrag.transform) {
    // Clamp: bar stays at least 1 column wide
    const dx = Math.min(leftDrag.transform.x, baseWidth - colW);
    visualLeft = baseLeft + dx;
    visualWidth = baseWidth - dx;
  } else if (rightDrag.transform) {
    visualWidth = Math.max(colW, baseWidth + rightDrag.transform.x);
  }

  // Body drag uses CSS transform so the bar follows the pointer without
  // changing `left` (which would be clipped by the overflow-hidden parent).
  const bodyTranslateX = bodyDrag.transform?.x ?? 0;

  const isAnyDragging = bodyDrag.isDragging || leftDrag.isDragging || rightDrag.isDragging;

  return (
    <div className="relative h-full w-full">
      {/*
        bodyDrag.setNodeRef on the outer bar so dnd-kit measures the full
        bar rect — required for the CSS transform to track the pointer correctly.
      */}
      <div
        ref={bodyDrag.setNodeRef}
        className="absolute top-1/2 -translate-y-1/2 rounded-[3px] flex items-center select-none overflow-visible"
        style={{
          left: visualLeft,
          width: visualWidth,
          height: barHeight,
          backgroundColor: color,
          opacity: isAnyDragging ? 0.85 : 0.9,
          // Body drag uses CSS transform instead of changing `left`.
          // Changing `left` fights with the overflow:hidden on the parent timeline
          // cell and produces a visible jump/clipping artefact.
          transform: bodyTranslateX ? `translateX(${bodyTranslateX}px) translateY(-50%)` : undefined,
          // z-index:auto avoids creating a stacking context at rest, which can
          // cause the element to visually escape its overflow:hidden parent.
          // During drag we need 10 so the bar paints above sibling rows.
          zIndex: isAnyDragging ? 10 : "auto",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Left resize handle */}
        {hasBothDates && (
          <div
            ref={leftDrag.setNodeRef}
            {...leftDrag.listeners}
            {...leftDrag.attributes}
            className="absolute left-0 top-0 bottom-0 w-2 hover:bg-white/30 transition-colors z-10 shrink-0"
            style={{ cursor: "ew-resize" }}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Body — drag activates here, click opens task */}
        <div
          {...bodyDrag.listeners}
          {...bodyDrag.attributes}
          className="flex-1 px-2 flex items-center overflow-hidden h-full min-w-0"
          style={{ cursor: bodyDrag.isDragging ? "grabbing" : "grab" }}
          onClick={() => onTaskClick(task.id)}
        >
          <span className="truncate text-[11px] font-medium text-white leading-none pointer-events-none">
            {task.title}
          </span>
        </div>

        {/* Right resize handle */}
        {hasBothDates && (
          <div
            ref={rightDrag.setNodeRef}
            {...rightDrag.listeners}
            {...rightDrag.attributes}
            className="absolute right-0 top-0 bottom-0 w-2 hover:bg-white/30 transition-colors z-10 shrink-0"
            style={{ cursor: "ew-resize" }}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {hovered && !isAnyDragging && <BarTooltip task={task} />}
      </div>
    </div>
  );
}

// ─── Linha de tarefa ──────────────────────────────────────────────────────────

function TaskRow({
  task,
  days,
  colW,
  todayCol,
  onTaskClick,
}: {
  task: GanttTask;
  days: Date[];
  colW: number;
  todayCol: number | null;
  onTaskClick: (id: string) => void;
}) {
  return (
    <div className="flex border-b isolate" style={{ height: ROW_H }}>
      {/* Coluna esquerda */}
      <div
        className="flex shrink-0 items-center gap-2 border-r px-3"
        style={{ width: LEFT_COL }}
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: PRIORITY_BAR[task.priority] }}
        />
        <span className="truncate text-xs">{task.title}</span>
        <DependencyBadge dependencies={task.dependencies ?? []} />
        {task.client && (
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground truncate max-w-[80px]">
            {task.client.name}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="relative flex-1 overflow-hidden">
        {/* Coluna do dia actual */}
        {todayCol !== null && (
          <div
            className="absolute inset-y-0 pointer-events-none"
            style={{
              left: todayCol * colW,
              width: colW,
              backgroundColor: "#A12B2B10",
            }}
          />
        )}
        {/* Linhas das colunas */}
        {days.map((_, i) => (
          <div
            key={i}
            className="absolute inset-y-0 border-r border-border/40"
            style={{ left: (i + 1) * colW }}
          />
        ))}
        <DraggableGanttBar task={task} days={days} colW={colW} onTaskClick={onTaskClick} />
      </div>
    </div>
  );
}

// ─── Grupo (Espaço) ───────────────────────────────────────────────────────────

function SpaceGroup({
  spaceName,
  tasks,
  days,
  colW,
  todayCol,
  onTaskClick,
}: {
  spaceName: string;
  tasks: GanttTask[];
  days: Date[];
  colW: number;
  todayCol: number | null;
  onTaskClick: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 border-b bg-muted/30 px-3 py-1.5 text-left text-xs font-semibold hover:bg-muted/50 transition-colors"
      >
        <div style={{ width: LEFT_COL - 24 }} className="flex items-center gap-1.5">
          {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          {spaceName}
          <span className="ml-1 text-muted-foreground font-normal">({tasks.length})</span>
        </div>
      </button>

      {!collapsed &&
        tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            days={days}
            colW={colW}
            todayCol={todayCol}
            onTaskClick={onTaskClick}
          />
        ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface TasksGanttProps {
  onTaskClick: (id: string) => void;
}

export function TasksGantt({ onTaskClick }: TasksGanttProps) {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>("semana");
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [noDatesOpen, setNoDatesOpen] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTasksForGanttAction().then((data) => {
      setTasks(data);
      setLoading(false);
    });
  }, []);

  // ── Intervalo de dias visível ──────────────────────────────────────────────

  const { days, colW, headerRows } = useMemo(() => {
    if (granularity === "semana") {
      const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
      const start = weekStart;
      const end = addDays(start, 27);
      const ds = eachDayOfInterval({ start, end });
      return { days: ds, colW: 36, headerRows: "day" as const };
    } else {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(addMonths(anchor, 2)), { weekStartsOn: 1 });
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      return { days: weeks, colW: 80, headerRows: "week" as const };
    }
  }, [granularity, anchor]);

  const daysForBars: Date[] = useMemo(() => {
    if (headerRows === "day") return days;
    return days.flatMap((w) => eachDayOfInterval({ start: w, end: addDays(w, 6) }));
  }, [days, headerRows]);

  const effectiveColW = headerRows === "week" ? colW / 7 : colW;

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const onScroll = () => {
      if (headerRef.current) {
        headerRef.current.scrollLeft = el.scrollLeft;
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Keep a ref so handleDragEnd always sees the latest colW without stale closures
  const effectiveColWRef = useRef(effectiveColW);
  useEffect(() => {
    effectiveColWRef.current = effectiveColW;
  }, [effectiveColW]);

  const todayIdx = useMemo(() => {
    const t = todayStr();
    const idx = daysForBars.findIndex((d) => format(d, "yyyy-MM-dd") === t);
    return idx >= 0 ? idx : null;
  }, [daysForBars]);

  // ── Navegação ─────────────────────────────────────────────────────────────

  function goBack() {
    if (granularity === "semana") setAnchor((a) => addWeeks(a, -4));
    else setAnchor((a) => addMonths(a, -3));
  }

  function goForward() {
    if (granularity === "semana") setAnchor((a) => addWeeks(a, 4));
    else setAnchor((a) => addMonths(a, 3));
  }

  function goToday() {
    setAnchor(startOfMonth(new Date()));
  }

  // ── Agrupamento ───────────────────────────────────────────────────────────

  const { grouped, noDate } = useMemo(() => {
    const withDates = tasks.filter((t) => t.start_date || t.due_date);
    const withoutDates = tasks.filter((t) => !t.start_date && !t.due_date);

    const spaceMap = new Map<string, GanttTask[]>();
    for (const task of withDates) {
      const key = task.space_name ?? "Sem espaço";
      if (!spaceMap.has(key)) spaceMap.set(key, []);
      spaceMap.get(key)!.push(task);
    }

    return {
      grouped: [...spaceMap.entries()].sort(([a], [b]) => a.localeCompare(b)),
      noDate: withoutDates,
    };
  }, [tasks]);

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // ── DEBUG: remove these three handlers once the bug is diagnosed ──────────

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      const fullId = active.id as string;
      const sepIdx = fullId.indexOf("::");
      if (sepIdx === -1) return;
      const type = fullId.slice(0, sepIdx);
      const taskId = fullId.slice(sepIdx + 2);

      const task = tasks.find((t) => t.id === taskId);
      if (!task || type !== "body") return;

      const colW = effectiveColWRef.current;
      const startD = task.start_date ? parseISO(task.start_date) : null;
      const endD = task.due_date ? parseISO(task.due_date) : null;
      const firstDay = daysForBars[0];

      const startOffset = startD
        ? Math.max(0, differenceInCalendarDays(startD, firstDay))
        : 0;
      const baseLeft = startOffset * colW;

      // Measure the actual scrollable container so we can compare px space
      const containerEl = timelineRef.current;
      const containerRect = containerEl?.getBoundingClientRect();

      // Measure the dragged element via the active node ref
      const activeEl = active.rect.current?.translated;

      console.group(`[GANTT DEBUG] onDragStart — "${task.title}" (${type})`);
      console.log("task.start_date:", task.start_date, "| task.due_date:", task.due_date);
      console.log("effectiveColW (px/day):", colW);
      console.log("startOffset (days):", startOffset);
      console.log("baseLeft (px):", baseLeft, "  ← computed left CSS of bar");
      console.log("container scrollLeft:", containerEl?.scrollLeft ?? "N/A");
      console.log("container getBoundingClientRect():", containerRect
        ? `left=${containerRect.left.toFixed(1)} width=${containerRect.width.toFixed(1)}`
        : "N/A");
      console.log("active.rect.current.translated:", activeEl
        ? `left=${activeEl.left.toFixed(1)} width=${activeEl.width.toFixed(1)}`
        : "not yet available");
      console.groupEnd();
    },
    [tasks, daysForBars],
  );

  const handleDragMove = useCallback(
    ({ active, delta }: DragMoveEvent) => {
      const fullId = active.id as string;
      if (!fullId.startsWith("body::")) return;
      // Throttle: log only every ~10 events to keep the console readable
      if (Math.abs(delta.x) % 10 > 5) return;

      const colW = effectiveColWRef.current;
      console.log(
        `[GANTT DEBUG] onDragMove | delta.x=${delta.x.toFixed(1)}px | translateX applied=${delta.x.toFixed(1)}px | colW=${colW}px | approx days=${(delta.x / colW).toFixed(2)}`,
      );
    },
    [],
  );

  // ── END DEBUG ─────────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    async ({ active, delta }: DragEndEvent) => {
      const fullId = active.id as string;
      const sepIdx = fullId.indexOf("::");
      if (sepIdx === -1) return;
      const type = fullId.slice(0, sepIdx);
      const taskId = fullId.slice(sepIdx + 2);

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const colW = effectiveColWRef.current;
      const dayDelta = Math.round(delta.x / colW);

      // ── DEBUG ──────────────────────────────────────────────────────────────
      if (type === "body") {
        const startD = task.start_date ? parseISO(task.start_date) : null;
        const firstDay = daysForBars[0];
        const startOffset = startD
          ? Math.max(0, differenceInCalendarDays(startD, firstDay))
          : 0;
        const baseLeft = startOffset * colW;
        const newBaseLeft = (startOffset + dayDelta) * colW;

        console.group(`[GANTT DEBUG] onDragEnd — "${task.title}" (${type})`);
        console.log("delta.x (raw from dnd-kit):", delta.x.toFixed(1), "px");
        console.log("effectiveColW:", colW, "px/day");
        console.log("dayDelta (rounded):", dayDelta, "days");
        console.log("baseLeft BEFORE:", baseLeft, "px  →  AFTER:", newBaseLeft, "px");
        console.log(
          "expected new start_date:",
          task.start_date
            ? format(addDays(parseISO(task.start_date), dayDelta), "yyyy-MM-dd")
            : "N/A",
        );
        console.log(
          "expected new due_date:",
          task.due_date
            ? format(addDays(parseISO(task.due_date), dayDelta), "yyyy-MM-dd")
            : "N/A",
        );
        console.groupEnd();
      }
      // ── END DEBUG ──────────────────────────────────────────────────────────

      if (dayDelta === 0) return;

      let newStart = task.start_date;
      let newEnd = task.due_date;

      if (type === "body") {
        if (task.start_date)
          newStart = format(addDays(parseISO(task.start_date), dayDelta), "yyyy-MM-dd");
        if (task.due_date)
          newEnd = format(addDays(parseISO(task.due_date), dayDelta), "yyyy-MM-dd");
      } else if (type === "left" && task.start_date && task.due_date) {
        const proposed = addDays(parseISO(task.start_date), dayDelta);
        const endDate = parseISO(task.due_date);
        newStart = format(
          proposed < endDate ? proposed : addDays(endDate, -1),
          "yyyy-MM-dd",
        );
      } else if (type === "right" && task.due_date) {
        const proposed = addDays(parseISO(task.due_date), dayDelta);
        const startDate = task.start_date ? parseISO(task.start_date) : null;
        newEnd = format(
          !startDate || proposed > startDate ? proposed : addDays(startDate, 1),
          "yyyy-MM-dd",
        );
      }

      // Optimistic update
      const prevTasks = tasks;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, start_date: newStart ?? null, due_date: newEnd ?? null }
            : t,
        ),
      );

      const result = await updateTaskDatesAction(taskId, {
        start_date: newStart ?? null,
        due_date: newEnd ?? null,
      });

      if (result?.error) {
        setTasks(prevTasks);
        toast.error("Erro ao atualizar datas da tarefa");
      }
    },
    [tasks],
  );

  // ── Header da timeline ────────────────────────────────────────────────────

  const periodLabel = useMemo(() => {
    if (granularity === "semana") {
      const first = daysForBars[0];
      const last = daysForBars[daysForBars.length - 1];
      if (isSameMonth(first, last)) {
        return format(first, "MMMM yyyy", { locale: pt });
      }
      return `${format(first, "MMM", { locale: pt })} – ${format(last, "MMM yyyy", { locale: pt })}`;
    } else {
      return `${format(days[0], "MMM", { locale: pt })} – ${format(days[days.length - 1], "MMM yyyy", { locale: pt })}`;
    }
  }, [granularity, days, daysForBars]);

  if (loading) {
    return (
      <div className="flex-1 overflow-hidden">
        <GanttSkeleton />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-center">
        <div>
          <p className="text-sm font-medium">Nenhuma tarefa com datas definidas.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Adiciona datas de início ou fim às tarefas para as ver aqui.
          </p>
        </div>
      </div>
    );
  }

  const timelineTotalW = daysForBars.length * effectiveColW;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd} onDragCancel={() => { /* dnd-kit auto-resets transform; no extra state to clean up */ }}>
      <div className="flex h-full flex-col overflow-hidden">
        {/* ── Toolbar ── */}
        <div className="flex shrink-0 items-center gap-3 border-b px-6 py-3 bg-background">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goForward}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <span className="text-sm font-semibold capitalize">{periodLabel}</span>

          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goToday}>
            Hoje
          </Button>

          <div className="ml-auto flex rounded-md border overflow-hidden">
            {(["semana", "mes"] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={cn(
                  "px-3 py-1 text-xs capitalize transition-colors",
                  granularity === g ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                {g === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Legenda ── */}
        <div className="shrink-0 flex items-center gap-5 border-b px-6 py-2 bg-background text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Prioridade:</span>
          {(["urgente", "alta", "media", "baixa", "sem_prioridade"] as const).map((key) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: PRIORITY_BAR[key] }} />
              {PRIORITY_LABELS[key]}
            </span>
          ))}
        </div>

        {/* ── Grid ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Coluna esquerda fixa — cabeçalho */}
          <div className="flex shrink-0 flex-col overflow-hidden" style={{ width: LEFT_COL }}>
            <div
              className="shrink-0 border-b border-r bg-muted/20 flex items-end px-3 pb-2"
              style={{ height: HEADER_H }}
            >
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Tarefa
              </span>
            </div>
          </div>

          {/* Timeline + scroll horizontal */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header fixo da timeline */}
            <div
              ref={headerRef}
              className="shrink-0 border-b bg-muted/20 overflow-hidden"
              style={{ height: HEADER_H }}
            >
              <div style={{ minWidth: LEFT_COL + timelineTotalW }}>
                {granularity === "semana" ? (
                  <div className="flex h-full">
                    <div style={{ width: LEFT_COL }} className="shrink-0" />
                    {daysForBars.map((d, i) => {
                      const isCurrentDay = isToday(d);
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex shrink-0 flex-col items-center justify-end border-r pb-1.5 gap-0.5",
                            isCurrentDay && "bg-[#A12B2B10]",
                          )}
                          style={{ width: colW }}
                        >
                          <span className="text-[10px] uppercase text-muted-foreground leading-none">
                            {format(d, "EEE", { locale: pt })}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-medium leading-none",
                              isCurrentDay ? "text-[#A12B2B] font-bold" : "text-foreground",
                            )}
                          >
                            {format(d, "d")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full">
                    <div style={{ width: LEFT_COL }} className="shrink-0" />
                    {days.map((w, i) => {
                      const hasToday = daysForBars
                        .slice(i * 7, i * 7 + 7)
                        .some((d) => isToday(d));
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex shrink-0 flex-col items-center justify-end border-r pb-1.5 gap-0.5",
                            hasToday && "bg-[#A12B2B10]",
                          )}
                          style={{ width: colW }}
                        >
                          <span className="text-[10px] text-muted-foreground uppercase leading-none">
                            {format(w, "MMM", { locale: pt })}
                          </span>
                          <span className={cn("text-xs font-medium", hasToday && "text-[#A12B2B] font-bold")}>
                            S{getISOWeek(w)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Corpo — scroll */}
            <div ref={timelineRef} className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div style={{ minWidth: timelineTotalW }}>
                {grouped.map(([spaceName, spaceTasks]) => (
                  <SpaceGroup
                    key={spaceName}
                    spaceName={spaceName}
                    tasks={spaceTasks}
                    days={daysForBars}
                    colW={effectiveColW}
                    todayCol={todayIdx}
                    onTaskClick={onTaskClick}
                  />
                ))}

                {/* Sem datas */}
                {noDate.length > 0 && (
                  <div className="border-t">
                    <button
                      onClick={() => setNoDatesOpen((v) => !v)}
                      className="flex w-full items-center gap-2 border-b bg-muted/10 px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
                    >
                      <div style={{ width: LEFT_COL - 24 }} className="flex items-center gap-1.5">
                        {noDatesOpen ? (
                          <ChevronDown className="size-3" />
                        ) : (
                          <ChevronDown className="size-3 -rotate-90" />
                        )}
                        Sem datas definidas ({noDate.length})
                      </div>
                    </button>
                    {noDatesOpen &&
                      noDate.map((task) => (
                        <div key={task.id} className="flex border-b" style={{ height: ROW_H }}>
                          <div
                            className="flex shrink-0 items-center gap-2 border-r px-3 overflow-hidden"
                            style={{ width: LEFT_COL }}
                          >
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: PRIORITY_BAR[task.priority] }}
                            />
                            <button
                              onClick={() => onTaskClick(task.id)}
                              className="truncate text-xs text-left hover:underline"
                            >
                              {task.title}
                            </button>
                          </div>
                          <div className="flex-1 border-r" />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
