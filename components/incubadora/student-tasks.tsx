"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getTasksForStudentAction,
  updateTaskDeliveryAction,
  markTaskCompleteAction,
} from "@/lib/actions/tasks";
import type { StudentTask } from "@/lib/queries/tasks";

// ── Types ────────────────────────────────────────────────────────────────────

interface StudentTasksGrouped {
  thisWeek: StudentTask[];
  overdue: StudentTask[];
  upcoming: StudentTask[];
  noDueDate: StudentTask[];
  completedThisWeek: StudentTask[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function groupTasks(tasks: StudentTask[]): StudentTasksGrouped {
  const { monday, sunday } = getWeekBounds();
  const result: StudentTasksGrouped = {
    thisWeek: [],
    overdue: [],
    upcoming: [],
    noDueDate: [],
    completedThisWeek: [],
  };
  for (const task of tasks) {
    if (task.completed_at) {
      const d = new Date(task.completed_at);
      if (d >= monday && d <= sunday) result.completedThisWeek.push(task);
      continue;
    }
    if (!task.due_date) {
      result.noDueDate.push(task);
      continue;
    }
    const [y, m, dd] = task.due_date.split("-").map(Number);
    const due = new Date(y, m - 1, dd);
    if (due < monday) result.overdue.push(task);
    else if (due <= sunday) result.thisWeek.push(task);
    else result.upcoming.push(task);
  }
  return result;
}

function getWeekLabel(): string {
  const { monday, sunday } = getWeekBounds();
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
  return `${fmt(monday)} a ${fmt(sunday)}`;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
  });
}

const PRIORITY_BADGE: Record<string, string> = {
  urgente: "border-transparent bg-[#A12B2B] text-white",
  alta: "border-transparent bg-orange-500 text-white",
  media: "border-transparent bg-blue-500 text-white",
  baixa: "border-transparent bg-slate-400 text-white",
  sem_prioridade: "",
};

const PRIORITY_LABEL: Record<string, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  sem_prioridade: "",
};

// ── TaskCard ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: StudentTask;
  completed?: boolean;
  onComplete: (id: string) => void;
  completing: string | null;
  expandedDelivery: string | null;
  onToggleDelivery: (id: string | null) => void;
  deliveryInputs: Record<string, string>;
  onDeliveryChange: (id: string, val: string) => void;
  onSaveDelivery: (id: string) => void;
  savingDelivery: string | null;
}

function TaskCard({
  task,
  completed = false,
  onComplete,
  completing,
  expandedDelivery,
  onToggleDelivery,
  deliveryInputs,
  onDeliveryChange,
  onSaveDelivery,
  savingDelivery,
}: TaskCardProps) {
  const isDeliveryOpen = expandedDelivery === task.id;
  const hasPriority = task.priority !== "sem_prioridade";

  return (
    <div className="space-y-2.5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p
            className={`text-sm font-medium leading-snug ${
              completed ? "text-muted-foreground line-through" : ""
            }`}
          >
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {task.status && (
              <Badge
                className="rounded-full text-[10px] font-medium"
                style={{
                  backgroundColor: task.status.color + "20",
                  color: task.status.color,
                  border: `1px solid ${task.status.color}40`,
                }}
              >
                {task.status.label}
              </Badge>
            )}
            {hasPriority && (
              <Badge
                className={`rounded-full text-[10px] font-medium ${PRIORITY_BADGE[task.priority]}`}
              >
                {PRIORITY_LABEL[task.priority]}
              </Badge>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {formatDate(task.due_date)}
              </span>
            )}
            {task.estimate_points != null && (
              <span className="text-xs text-muted-foreground">
                ~{task.estimate_points}h
              </span>
            )}
          </div>
          {(task.space_name || task.list_name) && (
            <p className="text-[11px] text-muted-foreground/60">
              {[task.space_name, task.list_name].filter(Boolean).join(" › ")}
            </p>
          )}
        </div>

        <div className="shrink-0">
          {completed ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="size-4" />
              Concluída
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={completing === task.id}
              onClick={() => onComplete(task.id)}
            >
              {completing === task.id ? "A concluir..." : "Concluir"}
            </Button>
          )}
        </div>
      </div>

      {!isDeliveryOpen && (
        <div className="flex items-center gap-3">
          {task.delivery_url && (
            <a
              href={task.delivery_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink className="size-3" />
              {task.delivery_url.length > 55
                ? task.delivery_url.slice(0, 55) + "…"
                : task.delivery_url}
            </a>
          )}
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onToggleDelivery(task.id)}
          >
            <LinkIcon className="size-3" />
            {task.delivery_url ? "Editar link" : "Adicionar link de entrega"}
          </button>
        </div>
      )}

      {isDeliveryOpen && (
        <div className="flex items-center gap-2">
          <Input
            value={deliveryInputs[task.id] ?? ""}
            onChange={(e) => onDeliveryChange(task.id, e.target.value)}
            placeholder="https://drive.google.com/…"
            className="h-8 text-xs"
            autoFocus
          />
          <Button
            size="sm"
            className="h-8 shrink-0 text-xs"
            disabled={savingDelivery === task.id}
            onClick={() => onSaveDelivery(task.id)}
          >
            {savingDelivery === task.id ? "A guardar..." : "Guardar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => onToggleDelivery(null)}
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  userId: string;
}

export function StudentTasks({ userId }: Props) {
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [deliveryInputs, setDeliveryInputs] = useState<Record<string, string>>({});
  const [savingDelivery, setSavingDelivery] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [noDueDateOpen, setNoDueDateOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  useEffect(() => {
    getTasksForStudentAction(userId).then((data) => {
      setTasks(data);
      const inputs: Record<string, string> = {};
      for (const t of data) inputs[t.id] = t.delivery_url ?? "";
      setDeliveryInputs(inputs);
      setLoading(false);
    });
  }, [userId]);

  async function handleSaveDelivery(taskId: string) {
    setSavingDelivery(taskId);
    const url = deliveryInputs[taskId] || null;
    const result = await updateTaskDeliveryAction(taskId, url);
    setSavingDelivery(null);
    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Erro ao guardar link");
      return;
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, delivery_url: url } : t)),
    );
    toast.success("Link de entrega guardado");
    setExpandedDelivery(null);
  }

  async function handleComplete(taskId: string) {
    setCompleting(taskId);
    const result = await markTaskCompleteAction(taskId);
    setCompleting(null);
    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Erro ao concluir tarefa");
      return;
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, completed_at: new Date().toISOString() } : t,
      ),
    );
    toast.success("Tarefa marcada como concluída");
    setExpandedDelivery(taskId);
  }

  if (loading) {
    return (
      <div className="border bg-card p-6">
        <p className="text-sm text-muted-foreground">A carregar tarefas...</p>
      </div>
    );
  }

  const grouped = groupTasks(tasks);
  const weekLabel = getWeekLabel();
  const { monday, sunday } = getWeekBounds();

  const completedWithDueThisWeek = grouped.completedThisWeek.filter((t) => {
    if (!t.due_date) return false;
    const [y, m, dd] = t.due_date.split("-").map(Number);
    const due = new Date(y, m - 1, dd);
    return due >= monday && due <= sunday;
  });
  const thisWeekTotal = grouped.thisWeek.length + completedWithDueThisWeek.length;
  const thisWeekDone = completedWithDueThisWeek.length;

  const hasAnyTask =
    grouped.thisWeek.length > 0 ||
    grouped.overdue.length > 0 ||
    grouped.upcoming.length > 0 ||
    grouped.noDueDate.length > 0 ||
    grouped.completedThisWeek.length > 0;

  const sharedProps = {
    completing,
    expandedDelivery,
    onToggleDelivery: setExpandedDelivery,
    deliveryInputs,
    onDeliveryChange: (id: string, val: string) =>
      setDeliveryInputs((prev) => ({ ...prev, [id]: val })),
    onSaveDelivery: handleSaveDelivery,
    savingDelivery,
  };

  if (!hasAnyTask) {
    return (
      <div className="border bg-card p-5">
        <h3 className="mb-1.5 font-semibold">Plano Semanal</h3>
        <p className="text-sm text-muted-foreground">
          Ainda não tens tarefas atribuídas. A tua coach irá atribuir tarefas em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Esta semana ───────────────────────────────────── */}
      <div className="border bg-card overflow-hidden">
        <div className="border-b px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-[#A12B2B]" />
              <h3 className="font-semibold text-sm">Plano desta semana</h3>
              <span className="text-xs text-muted-foreground">{weekLabel}</span>
            </div>
            {grouped.thisWeek.length > 0 && (
              <Badge className="rounded-full border-transparent bg-[#A12B2B] text-white text-xs">
                {grouped.thisWeek.length} pendente{grouped.thisWeek.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {thisWeekTotal > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {thisWeekDone} de {thisWeekTotal} concluída{thisWeekTotal !== 1 ? "s" : ""}
                </span>
                <span>{Math.round((thisWeekDone / thisWeekTotal) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(thisWeekDone / thisWeekTotal) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {thisWeekTotal === 0 ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">
            Ainda não tens tarefas para esta semana. A tua coach irá definir o teu plano em breve.
          </div>
        ) : (
          <div className="divide-y">
            {grouped.thisWeek.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleComplete}
                {...sharedProps}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Em atraso ─────────────────────────────────────── */}
      {grouped.overdue.length > 0 && (
        <div className="border border-red-200 bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 dark:bg-red-950/20 px-5 py-3">
            <AlertTriangle className="size-4 text-red-600" />
            <h3 className="font-semibold text-sm text-red-700 dark:text-red-400">Em atraso</h3>
            <Badge className="rounded-full border-transparent bg-red-600 text-white text-xs ml-auto">
              {grouped.overdue.length}
            </Badge>
          </div>
          <div className="divide-y">
            {grouped.overdue.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleComplete}
                {...sharedProps}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Próximas ──────────────────────────────────────── */}
      {grouped.upcoming.length > 0 && (
        <div className="border bg-card overflow-hidden">
          <button
            className="flex w-full items-center gap-2 px-5 py-3 text-left hover:bg-muted/30 transition-colors"
            onClick={() => setUpcomingOpen((v) => !v)}
          >
            {upcomingOpen ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
            <h3 className="font-semibold text-sm">A seguir</h3>
            <Badge className="rounded-full border border-muted-foreground/30 bg-transparent text-muted-foreground text-xs ml-auto">
              {grouped.upcoming.length}
            </Badge>
          </button>
          {upcomingOpen && (
            <div className="divide-y border-t">
              {grouped.upcoming.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  {...sharedProps}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sem data ──────────────────────────────────────── */}
      {grouped.noDueDate.length > 0 && (
        <div className="border bg-card overflow-hidden">
          <button
            className="flex w-full items-center gap-2 px-5 py-3 text-left hover:bg-muted/30 transition-colors"
            onClick={() => setNoDueDateOpen((v) => !v)}
          >
            {noDueDateOpen ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
            <h3 className="font-semibold text-sm">Sem data definida</h3>
            <Badge className="rounded-full border border-muted-foreground/30 bg-transparent text-muted-foreground text-xs ml-auto">
              {grouped.noDueDate.length}
            </Badge>
          </button>
          {noDueDateOpen && (
            <div className="divide-y border-t">
              {grouped.noDueDate.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  {...sharedProps}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Concluídas esta semana ────────────────────────── */}
      {grouped.completedThisWeek.length > 0 && (
        <div className="border bg-card overflow-hidden">
          <button
            className="flex w-full items-center gap-2 px-5 py-3 text-left hover:bg-muted/30 transition-colors"
            onClick={() => setCompletedOpen((v) => !v)}
          >
            {completedOpen ? (
              <ChevronDown className="size-4 text-emerald-600" />
            ) : (
              <ChevronRight className="size-4 text-emerald-600" />
            )}
            <h3 className="font-semibold text-sm text-emerald-700 dark:text-emerald-500">
              Concluídas esta semana
            </h3>
            <Badge className="rounded-full border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs ml-auto">
              {grouped.completedThisWeek.length}
            </Badge>
          </button>
          {completedOpen && (
            <div className="divide-y border-t">
              {grouped.completedThisWeek.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  completed
                  onComplete={handleComplete}
                  {...sharedProps}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
