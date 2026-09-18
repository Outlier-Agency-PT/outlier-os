"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { CheckCircle, Trash2 } from "lucide-react";
import { approveTaskAction, rejectTaskAction, updateTaskAction } from "@/lib/actions/tasks";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/lib/queries/tasks";

type Priority = "sem_prioridade" | "baixa" | "media" | "alta" | "urgente";

interface PendingApprovalModalProps {
  tasks: TaskWithRelations[];
  members: { id: string; label: string }[];
  clients: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTasksChange: (remaining: TaskWithRelations[]) => void;
}

interface TaskState {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  due_date: string | null;
  client_id: string | null;
  assignee_id: string | null;
  assignees: string[];
  estimate_hours: number;
  estimate_mins: number;
}

function toTaskState(t: TaskWithRelations): TaskState {
  const raw = t as any;
  return {
    id: t.id,
    title: t.title,
    description: raw.description ?? null,
    priority: (raw.priority as Priority) ?? "media",
    due_date: raw.due_date ?? null,
    client_id: raw.client_id ?? (t.client?.id ?? null),
    assignee_id: t.assignee_id ?? (t.assignee?.id ?? null),
    assignees: raw.assignees ?? [],
    estimate_hours: t.estimate_points != null ? Math.floor(t.estimate_points) : 0,
    estimate_mins: t.estimate_points != null ? Math.round((t.estimate_points % 1) * 60) : 0,
  };
}

export function PendingApprovalModal({
  tasks: initialTasks,
  members,
  clients,
  open,
  onOpenChange,
  onTasksChange,
}: PendingApprovalModalProps) {
  const [originalTasks] = useState(initialTasks);
  const [taskStates, setTaskStates] = useState<TaskState[]>(
    initialTasks.map(toTaskState),
  );
  const [loading, setLoading] = useState<Record<string, "approve" | "reject" | null>>({});

  function updateTask(id: string, patch: Partial<TaskState>) {
    setTaskStates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function toggleAssignee(taskId: string, memberId: string, checked: boolean) {
    setTaskStates((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const next = checked
          ? [...new Set([...t.assignees, memberId])]
          : t.assignees.filter((id) => id !== memberId);
        return { ...t, assignees: next };
      }),
    );
  }

  async function handleApprove(taskId: string) {
    const ts = taskStates.find((t) => t.id === taskId);
    if (!ts) return;
    setLoading((prev) => ({ ...prev, [taskId]: "approve" }));

    const estimate = ts.estimate_hours + ts.estimate_mins / 60;
    await updateTaskAction(taskId, {
      title: ts.title || undefined,
      description: ts.description ?? null,
      priority: ts.priority,
      due_date: ts.due_date ?? null,
      client_id: ts.client_id ?? null,
      assignee_id: ts.assignee_id ?? undefined,
      assignees: ts.assignees,
      estimate_points: estimate > 0 ? estimate : null,
    });

    const result = await approveTaskAction(taskId);
    setLoading((prev) => ({ ...prev, [taskId]: null }));

    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }

    const next = taskStates.filter((t) => t.id !== taskId);
    const remainingIds = new Set(next.map((t) => t.id));
    setTaskStates(next);
    onTasksChange(originalTasks.filter((t) => remainingIds.has(t.id)));
    if (next.length === 0) onOpenChange(false);
    toast.success("Tarefa aprovada");
  }

  async function handleReject(taskId: string) {
    setLoading((prev) => ({ ...prev, [taskId]: "reject" }));
    const result = await rejectTaskAction(taskId);
    setLoading((prev) => ({ ...prev, [taskId]: null }));

    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }

    const next = taskStates.filter((t) => t.id !== taskId);
    const remainingIds = new Set(next.map((t) => t.id));
    setTaskStates(next);
    onTasksChange(originalTasks.filter((t) => remainingIds.has(t.id)));
    if (next.length === 0) onOpenChange(false);
    toast.success("Tarefa rejeitada");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tarefas para aprovar</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          {taskStates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sem tarefas pendentes.
            </p>
          )}
          {taskStates.map((ts) => (
            <div
              key={ts.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-4"
            >
              {/* Title */}
              <Input
                value={ts.title}
                onChange={(e) => updateTask(ts.id, { title: e.target.value })}
                className="font-medium"
              />

              {/* Description */}
              <div>
                <Label className="mb-1 block text-xs font-semibold">Descrição</Label>
                <Textarea
                  value={ts.description ?? ""}
                  onChange={(e) =>
                    updateTask(ts.id, { description: e.target.value || null })
                  }
                  rows={2}
                  className="text-sm"
                />
              </div>

              {/* Priority + Due date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-xs font-semibold">Prioridade</Label>
                  <Select
                    value={ts.priority}
                    onValueChange={(v) => updateTask(ts.id, { priority: v as Priority })}
                  >
                    <SelectTrigger className="h-8 text-xs">
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
                <div>
                  <Label className="mb-1 block text-xs font-semibold">Data Limite</Label>
                  <Input
                    type="date"
                    value={ts.due_date ?? ""}
                    onChange={(e) =>
                      updateTask(ts.id, { due_date: e.target.value || null })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Cliente + Assignee (single) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-xs font-semibold">Cliente</Label>
                  <Select
                    value={ts.client_id ?? "none"}
                    onValueChange={(v) =>
                      updateTask(ts.id, { client_id: v === "none" ? null : v })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Sem cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem cliente</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-semibold">Responsável</Label>
                  <Select
                    value={ts.assignee_id ?? "none"}
                    onValueChange={(v) =>
                      updateTask(ts.id, { assignee_id: v === "none" ? null : v })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Sem responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem responsável</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Responsáveis (multi-assignee checkboxes) */}
              <div>
                <Label className="mb-1 block text-xs font-semibold">Responsáveis</Label>
                <div className="space-y-1">
                  {members.map((m) => {
                    const checked = ts.assignees.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            toggleAssignee(ts.id, m.id, e.target.checked)
                          }
                          className="size-4 rounded"
                        />
                        <span className="text-sm">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Estimate */}
              <div>
                <Label className="mb-1 block text-xs font-semibold">Estimativa</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="h-8 w-20 text-xs"
                    value={ts.estimate_hours || ""}
                    onChange={(e) => {
                      const h = parseInt(e.target.value, 10);
                      updateTask(ts.id, { estimate_hours: isNaN(h) ? 0 : h });
                    }}
                  />
                  <span className="text-xs text-muted-foreground">h</span>
                  <Select
                    value={String(ts.estimate_mins)}
                    onValueChange={(v) =>
                      updateTask(ts.id, { estimate_mins: parseInt(v, 10) })
                    }
                  >
                    <SelectTrigger className="h-8 w-20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 min</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleReject(ts.id)}
                  disabled={!!loading[ts.id]}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Rejeitar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(ts.id)}
                  disabled={!!loading[ts.id]}
                >
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  Aprovar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
