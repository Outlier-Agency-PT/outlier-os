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
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getTasksForStudentAction, createTaskAction } from "@/lib/actions/tasks";
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

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
  });
}

function sundayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function sundayOfNextWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 7 : 14 - day;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return d.toISOString().split("T")[0];
}

// ── Task row (coach view) ─────────────────────────────────────────────────────

function CoachTaskRow({ task }: { task: StudentTask }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded border bg-card p-3 text-sm">
      <div className="min-w-0 flex-1 space-y-1">
        <p className={task.completed_at ? "text-muted-foreground line-through" : ""}>
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {task.status && (
            <Badge
              className="rounded-full text-[10px]"
              style={{
                backgroundColor: task.status.color + "20",
                color: task.status.color,
                border: `1px solid ${task.status.color}40`,
              }}
            >
              {task.status.label}
            </Badge>
          )}
          {task.due_date && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              {formatDate(task.due_date)}
            </span>
          )}
          {task.completed_at && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600">
              <CheckCircle2 className="size-3" />
              {formatDate(task.completed_at.split("T")[0])}
            </span>
          )}
        </div>
      </div>
      {task.delivery_url && (
        <a
          href={task.delivery_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-blue-600 hover:text-blue-700"
          title="Ver entrega do aluno"
        >
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  count: number;
  tasks: StudentTask[];
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  titleClass?: string;
  badgeClass?: string;
  headerClass?: string;
}

function CollapsibleSection({
  title,
  count,
  tasks,
  defaultOpen = false,
  icon,
  titleClass = "",
  badgeClass = "border border-muted-foreground/30 bg-transparent text-muted-foreground",
  headerClass = "",
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="space-y-2">
      <button
        className={`flex w-full items-center gap-2 text-left ${headerClass}`}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
        )}
        {icon}
        <span className={`text-xs font-semibold ${titleClass}`}>{title}</span>
        <Badge className={`rounded-full text-[10px] ml-auto ${badgeClass}`}>{count}</Badge>
      </button>
      {open && (
        <div className="space-y-1.5 pl-5">
          {tasks.map((t) => (
            <CoachTaskRow key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  userId: string | null | undefined;
  studentName: string;
}

export function StudentCoachTasks({ userId, studentName }: Props) {
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "sem_prioridade",
    due_date: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    getTasksForStudentAction(userId).then((data) => {
      setTasks(data);
      setLoading(false);
    });
  }, [userId]);

  async function handleCreate() {
    if (!form.title.trim() || !userId) return;
    setSaving(true);
    const result = await createTaskAction({
      title: form.title.trim(),
      priority: form.priority as any,
      due_date: form.due_date || undefined,
      assignees: [userId],
    });
    setSaving(false);
    if ("error" in result && result.error) {
      toast.error("Erro ao criar tarefa");
      return;
    }
    toast.success("Tarefa criada");
    setShowDialog(false);
    setForm({ title: "", description: "", priority: "sem_prioridade", due_date: "" });
    getTasksForStudentAction(userId).then(setTasks);
  }

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarefas do Aluno</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Conta do aluno não ligada — não é possível mostrar tarefas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const grouped = groupTasks(tasks);

  const { monday, sunday } = getWeekBounds();
  const completedWithDueThisWeek = grouped.completedThisWeek.filter((t) => {
    if (!t.due_date) return false;
    const [y, m, dd] = t.due_date.split("-").map(Number);
    const due = new Date(y, m - 1, dd);
    return due >= monday && due <= sunday;
  });
  const thisWeekTotal = grouped.thisWeek.length + completedWithDueThisWeek.length;
  const thisWeekDone = completedWithDueThisWeek.length;

  const pendingCount =
    grouped.thisWeek.length +
    grouped.overdue.length +
    grouped.upcoming.length +
    grouped.noDueDate.length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base">Tarefas do Aluno</CardTitle>
            {pendingCount > 0 && (
              <Badge className="rounded-full border-transparent bg-[#A12B2B] text-white text-xs">
                {pendingCount}
              </Badge>
            )}
            {thisWeekTotal > 0 && (
              <span className="text-xs text-muted-foreground">
                {thisWeekDone}/{thisWeekTotal} concluídas esta semana
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}>
            <Plus className="mr-1 size-3" />
            Nova Tarefa
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">A carregar...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma tarefa atribuída a este aluno ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Em atraso */}
              {grouped.overdue.length > 0 && (
                <CollapsibleSection
                  title="Em atraso"
                  count={grouped.overdue.length}
                  tasks={grouped.overdue}
                  defaultOpen
                  icon={<AlertTriangle className="size-3.5 text-red-600 shrink-0" />}
                  titleClass="text-red-700 dark:text-red-400"
                  badgeClass="border-transparent bg-red-600 text-white"
                />
              )}

              {/* Esta semana */}
              {grouped.thisWeek.length > 0 && (
                <CollapsibleSection
                  title="Esta semana"
                  count={grouped.thisWeek.length}
                  tasks={grouped.thisWeek}
                  defaultOpen
                  icon={<Calendar className="size-3.5 text-[#A12B2B] shrink-0" />}
                  badgeClass="border-transparent bg-[#A12B2B] text-white"
                />
              )}

              {/* Próximas */}
              <CollapsibleSection
                title="Próximas"
                count={grouped.upcoming.length}
                tasks={grouped.upcoming}
              />

              {/* Sem data */}
              <CollapsibleSection
                title="Sem data"
                count={grouped.noDueDate.length}
                tasks={grouped.noDueDate}
              />

              {/* Concluídas esta semana */}
              <CollapsibleSection
                title="Concluídas esta semana ✓"
                count={grouped.completedThisWeek.length}
                tasks={grouped.completedThisWeek}
                titleClass="text-emerald-700 dark:text-emerald-500"
                badgeClass="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa para {studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Criar 3 posts de autoridade"
                className="mt-1"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Contexto ou instruções para o aluno…"
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Prioridade</label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_prioridade">Sem prioridade</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Data limite</label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs"
                  onClick={() => setForm({ ...form, due_date: sundayOfCurrentWeek() })}
                >
                  Esta semana
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs"
                  onClick={() => setForm({ ...form, due_date: sundayOfNextWeek() })}
                >
                  Próxima semana
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>
              {saving ? "A criar..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
