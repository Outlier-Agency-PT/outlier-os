"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2, Play, Square, Maximize2, Minimize2, ChevronDown, ChevronRight } from "lucide-react";
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
import { StatusBadge } from "@/components/status-badge";
import { TaskComments } from "./task-comments";
import { SubtasksList } from "./subtasks-list";
import { TaskDependencies } from "./task-dependencies";
import {
  updateTaskAction,
  deleteTaskAction,
  startTimerAction,
  stopTimerAction,
  logTimeManualAction,
  getTaskTimeLogsAction,
  getTaskActivityAction,
  updateTaskDatesAction,
} from "@/lib/actions/tasks";
import { formatDuration, formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskWithHierarchy } from "@/lib/queries/tasks";
import type { TaskComment, TimeLogWithMember, TaskActivity } from "@/lib/queries/task-detail";

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

interface TaskDetailPanelProps {
  task: any; // TaskWithHierarchy or TaskWithRelations
  comments: TaskComment[];
  statuses: { id: string; key: string; label: string; color: string }[];
  lists: { id: string; name: string }[];
  members: { id: string; full_name: string }[];
  onClose: () => void;
  onTaskUpdate?: (field: string, value: unknown) => void;
}

export function TaskDetailPanel({
  task,
  comments,
  statuses,
  lists,
  members,
  onClose,
  onTaskUpdate,
}: TaskDetailPanelProps) {
  const router = useRouter();
  const [form, setForm] = useState(task ? { ...task } : null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setForm(task ? { ...task } : null);
  }, [task]);

  const [timeLogs, setTimeLogs] = useState<TimeLogWithMember[]>([]);
  const [manualTime, setManualTime] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [timeLoading, setTimeLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!task) return;
    let cancelled = false;
    getTaskTimeLogsAction(task.id).then((logs) => {
      if (!cancelled) setTimeLogs(logs);
    });
    return () => {
      cancelled = true;
    };
  }, [task?.id]);

  const runningLog = timeLogs.find((l) => !l.end_at) ?? null;

  const [activityLog, setActivityLog] = useState<TaskActivity[]>([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  async function loadActivity() {
    if (activityLog.length > 0) return;
    setActivityLoading(true);
    const entries = await getTaskActivityAction(task.id);
    setActivityLog(entries);
    setActivityLoading(false);
  }

  function handleActivityToggle() {
    const next = !activityOpen;
    setActivityOpen(next);
    if (next) loadActivity();
  }

  useEffect(() => {
    if (!runningLog) return;
    const start = new Date(runningLog.start_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [runningLog]);

  if (!task || !form) return null;

  async function refreshTimeLogs() {
    const logs = await getTaskTimeLogsAction(task.id);
    setTimeLogs(logs);
  }

  async function handleStartTimer() {
    setTimeLoading(true);
    const result = await startTimerAction(task.id);
    setTimeLoading(false);
    if ("error" in result && result.error) {
      toast.error("Erro ao iniciar timer");
      return;
    }
    await refreshTimeLogs();
  }

  async function handleStopTimer() {
    if (!runningLog) return;
    setTimeLoading(true);
    const result = await stopTimerAction(runningLog.id);
    setTimeLoading(false);
    if ("error" in result && result.error) {
      toast.error("Erro ao parar timer");
      return;
    }
    toast.success(`Tempo registado: ${formatDuration(result.durationMinutes ?? 0)}`);
    await refreshTimeLogs();
  }

  function parseHHMM(value: string): number | null {
    const match = value.trim().match(/^(\d{1,3}):([0-5]?\d)$/);
    if (!match) return null;
    const totalMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    return totalMinutes > 0 ? totalMinutes : null;
  }

  async function handleAddManualTime() {
    const minutes = parseHHMM(manualTime);
    if (minutes === null) {
      toast.error("Formato inválido. Usa hh:mm (ex: 1:30)");
      return;
    }
    setTimeLoading(true);
    const result = await logTimeManualAction(task.id, minutes, manualDescription || undefined);
    setTimeLoading(false);
    if ("error" in result && result.error) {
      toast.error("Erro ao registar tempo");
      return;
    }
    toast.success("Tempo registado");
    setManualTime("");
    setManualDescription("");
    await refreshTimeLogs();
  }

  async function handleUpdate(key: string, value: any) {
    setForm((prev) => prev ? { ...prev, [key]: value } : null);

    setLoading(true);
    const result = await updateTaskAction(task.id, { [key]: value } as any);
    setLoading(false);

    if ("error" in result && result.error) {
      toast.error("Erro ao atualizar tarefa");
      setForm((prev) => prev ? { ...prev, [key]: (task as any)[key] } : null);
    } else {
      toast.success("Tarefa atualizada");
      onTaskUpdate?.(key, value);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Tens a certeza que queres apagar esta tarefa?");
    if (!confirmed) return;

    setLoading(true);
    const result = await deleteTaskAction(task.id);
    setLoading(false);

    if ("error" in result && result.error) {
      toast.error("Erro ao apagar tarefa");
    } else {
      toast.success("Tarefa apagada");
      onClose();
      router.refresh();
    }
  }

  const titleField = (
    <div>
      <Label className="text-xs font-semibold">Título</Label>
      <Input
        value={form.title}
        onChange={(e) => handleUpdate("title", e.target.value)}
        className="mt-1.5 h-8 text-sm"
      />
    </div>
  );

  const descriptionField = (
    <div>
      <Label className="text-xs font-semibold">Descrição</Label>
      <Textarea
        value={form.description ?? ""}
        onChange={(e) => handleUpdate("description", e.target.value)}
        rows={3}
        className="mt-1.5 text-sm"
      />
    </div>
  );

  const statusField = (
    <div>
      <Label className="text-xs font-semibold">Estado</Label>
      <Select
        value={form.status_id ?? ""}
        onValueChange={(v) => handleUpdate("status_id", v || null)}
      >
        <SelectTrigger className="mt-1.5 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const priorityField = (
    <div>
      <Label className="text-xs font-semibold">Prioridade</Label>
      <Select
        value={form.priority}
        onValueChange={(v) =>
          handleUpdate(
            "priority",
            v as "sem_prioridade" | "baixa" | "media" | "alta" | "urgente"
          )
        }
      >
        <SelectTrigger className="mt-1.5 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sem_prioridade">Sem Prioridade</SelectItem>
          <SelectItem value="baixa">Baixa</SelectItem>
          <SelectItem value="media">Média</SelectItem>
          <SelectItem value="alta">Alta</SelectItem>
          <SelectItem value="urgente">Urgente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const statusPriorityGrid = (
    <div className="grid grid-cols-2 gap-4">
      {statusField}
      {priorityField}
    </div>
  );

  const dueDateField = (
    <div>
      <Label className="text-xs font-semibold">Data Limite</Label>
      <Input
        type="date"
        value={form.due_date ?? ""}
        onChange={(e) => handleUpdate("due_date", e.target.value)}
        className="mt-1.5 h-8 text-xs"
      />
    </div>
  );

  const startDateField = (
    <div>
      <Label className="text-xs font-semibold">Data de Início</Label>
      <Input
        type="date"
        value={form.start_date ?? ""}
        onChange={async (e) => {
          const val = e.target.value || null;
          if (val && form.due_date && val > form.due_date) {
            toast.error("Data de início posterior à data limite");
            return;
          }
          setForm((prev: any) => prev ? { ...prev, start_date: val } : null);
          setLoading(true);
          await updateTaskDatesAction(task.id, { start_date: val, due_date: form.due_date });
          setLoading(false);
        }}
        className="mt-1.5 h-8 text-xs"
      />
    </div>
  );

  const estimateField = (
    <div>
      <Label className="text-xs font-semibold">Estimativa (horas)</Label>
      <Input
        type="number"
        min="0.5"
        max="40"
        step="0.5"
        placeholder="ex: 2"
        value={form.estimate_points ?? ""}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          handleUpdate("estimate_points", !e.target.value || v <= 0 ? null : v);
        }}
        className="mt-1.5 h-8 text-xs"
      />
    </div>
  );

  const listField = (
    <div>
      <Label className="text-xs font-semibold">Lista</Label>
      <Select
        value={form.list_id ?? ""}
        onValueChange={(v) => handleUpdate("list_id", v || null)}
      >
        <SelectTrigger className="mt-1.5 h-8 text-xs">
          <SelectValue placeholder="Sem lista" />
        </SelectTrigger>
        <SelectContent>
          {lists.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const assigneesField = (
    <div>
      <Label className="text-xs font-semibold">Responsáveis</Label>
      <div className="mt-1.5 space-y-1">
        {members.map((member) => {
          const isAssigned = form.assignees?.includes(member.id) ?? false;
          return (
            <label key={member.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAssigned}
                onChange={(e) => {
                  const newAssignees = isAssigned
                    ? (form.assignees ?? []).filter((id) => id !== member.id)
                    : [...(form.assignees ?? []), member.id];
                  handleUpdate("assignees", newAssignees);
                }}
                className="size-4 rounded"
              />
              <span className="text-sm">{member.full_name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  const historySection = (
    <div className="border-t pt-4">
      <button
        type="button"
        onClick={handleActivityToggle}
        className="flex w-full items-center justify-between text-xs font-semibold"
      >
        <span>Histórico</span>
        {activityOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </button>

      {activityOpen && (
        <div className="mt-3 space-y-3">
          {activityLoading ? (
            <p className="text-xs text-muted-foreground">A carregar…</p>
          ) : activityLog.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem actividade registada.</p>
          ) : (
            activityLog.map((entry) => (
              <div key={entry.id} className="text-xs leading-snug">
                <span className="font-medium">{entry.member?.full_name ?? "Alguém"}</span>
                {" "}
                <span className="text-muted-foreground">{entry.description}</span>
                <span className="text-muted-foreground"> · {formatRelative(entry.created_at)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  const subtasksSection = (
    <div className="border-t pt-4">
      <SubtasksList task={form} statuses={statuses} />
    </div>
  );

  const dependenciesSection = (
    <div className="border-t pt-4">
      <TaskDependencies taskId={task.id} />
    </div>
  );

  const commentsSection = (
    <div className="border-t pt-4">
      <TaskComments taskId={task.id} comments={comments} />
    </div>
  );

  const timeTrackingSection = (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Registo de Tempo</Label>
        <span className="text-xs text-muted-foreground">
          Total: {formatDuration(timeLogs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0))}
        </span>
      </div>

      <div className="mt-2">
        {runningLog ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleStopTimer}
            disabled={timeLoading}
            className="w-full"
          >
            <Square className="size-3.5" />
            Parar timer ({formatElapsed(elapsed)})
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleStartTimer}
            disabled={timeLoading}
            className="w-full"
          >
            <Play className="size-3.5" />
            Iniciar timer
          </Button>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="manual-time" className="text-[11px] text-muted-foreground">
            hh:mm
          </Label>
          <Input
            id="manual-time"
            value={manualTime}
            onChange={(e) => setManualTime(e.target.value)}
            placeholder="1:30"
            className="h-8 text-xs"
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="manual-desc" className="text-[11px] text-muted-foreground">
            Descrição (opcional)
          </Label>
          <Input
            id="manual-desc"
            value={manualDescription}
            onChange={(e) => setManualDescription(e.target.value)}
            placeholder="O que fizeste"
            className="h-8 text-xs"
          />
        </div>
        <Button size="sm" variant="outline" onClick={handleAddManualTime} disabled={timeLoading}>
          Registar
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {timeLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem registos de tempo.</p>
        ) : (
          timeLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center justify-between text-xs">
              <div className="min-w-0">
                <p className="font-medium">
                  {log.duration_minutes !== null ? formatDuration(log.duration_minutes) : "A correr..."}
                  {log.description && (
                    <span className="ml-1.5 font-normal text-muted-foreground">— {log.description}</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {log.member?.full_name ?? "—"} · {formatRelative(log.start_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const headerNode = (
    <div className="flex items-center justify-between border-b px-6 py-4">
      <h2 className="font-semibold truncate">Detalhes da Tarefa</h2>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="h-6 w-6 p-0"
          title={isExpanded ? "Modo lateral" : "Ecrã completo"}
        >
          {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={loading}
          className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
          title="Apagar tarefa"
        >
          <Trash2 className="size-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-6 w-6 p-0">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {isExpanded ? (
        /* Modo ecrã completo */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="flex h-[85vh] w-full max-w-[900px] flex-col overflow-hidden rounded-lg border bg-background shadow-lg">
            {headerNode}
            <div className="grid flex-1 grid-cols-[60%_40%] divide-x overflow-hidden">
              <div className="space-y-6 overflow-y-auto px-6 py-4">
                {titleField}
                {descriptionField}
                {subtasksSection}
                {dependenciesSection}
                {commentsSection}
                {historySection}
              </div>
              <div className="space-y-6 overflow-y-auto px-6 py-4">
                {statusField}
                {priorityField}
                {assigneesField}
                {startDateField}
                {dueDateField}
                {estimateField}
                {listField}
                {timeTrackingSection}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Modo lateral */
        <div className="fixed right-0 top-0 h-screen w-96 bg-background border-l shadow-lg z-50 flex flex-col overflow-hidden">
          {headerNode}
          <div className="flex-1 overflow-y-auto space-y-6 px-6 py-4">
            {titleField}
            {descriptionField}
            {statusPriorityGrid}
            {startDateField}
            {dueDateField}
            {estimateField}
            {listField}
            {assigneesField}
            {subtasksSection}
            {dependenciesSection}
            {commentsSection}
            {historySection}
            {timeTrackingSection}
          </div>
        </div>
      )}
    </>
  );
}
