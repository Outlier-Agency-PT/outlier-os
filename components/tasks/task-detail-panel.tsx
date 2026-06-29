"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
import { updateTaskAction } from "@/lib/actions/tasks";
import { toast } from "sonner";
import type { TaskWithHierarchy } from "@/lib/queries/tasks";
import type { TaskComment } from "@/lib/queries/task-detail";

interface TaskDetailPanelProps {
  task: any; // TaskWithHierarchy or TaskWithRelations
  comments: TaskComment[];
  statuses: { id: string; key: string; label: string; color: string }[];
  lists: { id: string; name: string }[];
  members: { id: string; full_name: string }[];
  onClose: () => void;
}

export function TaskDetailPanel({
  task,
  comments,
  statuses,
  lists,
  members,
  onClose,
}: TaskDetailPanelProps) {
  const [form, setForm] = useState(task ? { ...task } : null);
  const [loading, setLoading] = useState(false);

  if (!task || !form) return null;

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
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-screen w-96 bg-background border-l shadow-lg z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold truncate">Detalhes da Tarefa</h2>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-6 w-6 p-0">
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-6 px-6 py-4">
          {/* Título */}
          <div>
            <Label className="text-xs font-semibold">Título</Label>
            <Input
              value={form.title}
              onChange={(e) => handleUpdate("title", e.target.value)}
              className="mt-1.5 h-8 text-sm"
            />
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-xs font-semibold">Descrição</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => handleUpdate("description", e.target.value)}
              rows={3}
              className="mt-1.5 text-sm"
            />
          </div>

          {/* Estado e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Data Limite */}
          <div>
            <Label className="text-xs font-semibold">Data Limite</Label>
            <Input
              type="date"
              value={form.due_date ?? ""}
              onChange={(e) => handleUpdate("due_date", e.target.value)}
              className="mt-1.5 h-8 text-xs"
            />
          </div>

          {/* Estimativa */}
          <div>
            <Label className="text-xs font-semibold">Estimativa (pontos)</Label>
            <Select
              value={form.estimate_points?.toString() ?? ""}
              onValueChange={(v) => handleUpdate("estimate_points", v ? parseInt(v) : null)}
            >
              <SelectTrigger className="mt-1.5 h-8 text-xs">
                <SelectValue placeholder="Sem estimativa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem estimativa</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="13">13</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista */}
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

          {/* Responsáveis */}
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

          {/* Subtarefas */}
          <div className="border-t pt-4">
            <SubtasksList task={form} statuses={statuses} />
          </div>

          {/* Comentários */}
          <div className="border-t pt-4">
            <TaskComments taskId={task.id} comments={comments} />
          </div>
        </div>
      </div>
    </>
  );
}
