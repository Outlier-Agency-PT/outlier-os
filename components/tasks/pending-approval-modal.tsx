"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface PendingApprovalModalProps {
  tasks: TaskWithRelations[];
  members: { id: string; label: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TaskState {
  id: string;
  title: string;
  assignee_id: string | null;
  estimate_hours: number;
  estimate_mins: number;
}

function toTaskState(t: TaskWithRelations): TaskState {
  return {
    id: t.id,
    title: t.title,
    assignee_id: t.assignee_id ?? (t.assignee?.id ?? null),
    estimate_hours: t.estimate_points != null ? Math.floor(t.estimate_points) : 0,
    estimate_mins: t.estimate_points != null ? Math.round((t.estimate_points % 1) * 60) : 0,
  };
}

export function PendingApprovalModal({
  tasks: initialTasks,
  members,
  open,
  onOpenChange,
}: PendingApprovalModalProps) {
  const [taskStates, setTaskStates] = useState<TaskState[]>(
    initialTasks.map(toTaskState),
  );
  const [loading, setLoading] = useState<Record<string, "approve" | "reject" | null>>({});

  function updateTask(id: string, patch: Partial<TaskState>) {
    setTaskStates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function handleApprove(taskId: string) {
    const ts = taskStates.find((t) => t.id === taskId);
    if (!ts) return;
    setLoading((prev) => ({ ...prev, [taskId]: "approve" }));

    const estimate = ts.estimate_hours + ts.estimate_mins / 60;
    await updateTaskAction(taskId, {
      title: ts.title || undefined,
      assignee_id: ts.assignee_id ?? undefined,
      estimate_points: estimate > 0 ? estimate : null,
    });

    const result = await approveTaskAction(taskId);
    setLoading((prev) => ({ ...prev, [taskId]: null }));

    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }

    const next = taskStates.filter((t) => t.id !== taskId);
    setTaskStates(next);
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
    setTaskStates(next);
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
              <Input
                value={ts.title}
                onChange={(e) => updateTask(ts.id, { title: e.target.value })}
                className="font-medium"
              />
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <Label className="mb-1 block text-xs font-semibold">
                    Estimativa
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      className="h-8 w-16 text-xs"
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
                      <SelectTrigger className="h-8 w-16 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 45].map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            {m}m
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
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
