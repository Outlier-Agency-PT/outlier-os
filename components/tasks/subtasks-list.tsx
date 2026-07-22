"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { createSubtaskAction, deleteTaskAction, updateTaskAction } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TaskWithHierarchy } from "@/lib/queries/tasks";

interface SubtasksListProps {
  task: any; // TaskWithHierarchy or TaskWithRelations
  statuses: { id: string; label: string; color: string }[];
}

export function SubtasksList({ task, statuses }: SubtasksListProps) {
  const subtasks = task.subtasks ?? [];
  const [expanded, setExpanded] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [loadingNew, setLoadingNew] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  async function handleCreateSubtask() {
    if (!newSubtaskTitle.trim()) return;
    setLoadingNew(true);
    const result = await createSubtaskAction(task.id, newSubtaskTitle);
    setLoadingNew(false);

    if ("error" in result && result.error) {
      toast.error("Erro ao criar subtarefa");
    } else {
      toast.success("Subtarefa criada");
      setNewSubtaskTitle("");
      setShowNewForm(false);
    }
  }

  async function handleToggleComplete(subtaskId: string, isCompleted: boolean) {
    setLoadingIds((prev) => new Set([...prev, subtaskId]));
    const completedAt = isCompleted ? null : new Date().toISOString();
    const result = await updateTaskAction(subtaskId, { completed_at: completedAt } as any);
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(subtaskId);
      return next;
    });

    if ("error" in result && result.error) {
      toast.error("Erro ao atualizar subtarefa");
    } else {
      toast.success(isCompleted ? "Subtarefa desmarcada" : "Subtarefa concluída");
    }
  }

  async function handleDelete(subtaskId: string) {
    if (!confirm("Eliminar subtarefa?")) return;
    setLoadingIds((prev) => new Set([...prev, subtaskId]));
    const result = await deleteTaskAction(subtaskId);
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(subtaskId);
      return next;
    });

    if ("error" in result && result.error) {
      toast.error("Erro ao eliminar subtarefa");
    } else {
      toast.success("Subtarefa eliminada");
    }
  }

  if (subtasks.length === 0 && !showNewForm) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowNewForm(true)}
        className="w-full text-xs"
      >
        <Plus className="size-3 mr-1" />
        Adicionar subtarefa
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {subtasks.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
          Subtarefas ({subtasks.length})
        </button>
      )}

      {expanded && (
        <div className="ml-2 space-y-2 border-l pl-3">
          {subtasks.map((subtask: any) => {
            const isCompleted = !!subtask.completed_at;
            const isLoading = loadingIds.has(subtask.id);

            return (
              <div
                key={subtask.id}
                className={cn(
                  "flex items-start gap-2 rounded-lg p-2 hover:bg-muted/50 transition-colors",
                  isCompleted && "opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  checked={isCompleted}
                  onChange={() => handleToggleComplete(subtask.id, isCompleted)}
                  disabled={isLoading}
                  className="mt-1 size-4 rounded cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm",
                      isCompleted && "line-through text-muted-foreground"
                    )}
                  >
                    {subtask.title}
                  </p>
                  {subtask.status && (
                    <div className="mt-1">
                      <StatusBadge label={subtask.status.label} color={subtask.status.color} />
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(subtask.id)}
                  disabled={isLoading}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {showNewForm && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-2">
          <Input
            placeholder="Título da subtarefa..."
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateSubtask();
            }}
            autoFocus
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNewForm(false);
                setNewSubtaskTitle("");
              }}
              className="h-7 flex-1 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSubtask}
              disabled={loadingNew || !newSubtaskTitle.trim()}
              className="h-7 flex-1 text-xs"
            >
              {loadingNew ? "..." : "Criar"}
            </Button>
          </div>
        </div>
      )}

      {!showNewForm && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNewForm(true)}
          className="w-full text-xs"
        >
          <Plus className="size-3 mr-1" />
          Adicionar subtarefa
        </Button>
      )}
    </div>
  );
}
