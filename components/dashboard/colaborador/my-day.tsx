"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";
import { moveTaskStatusAction, getTaskDetailAction, fetchTaskFormDataAction } from "@/lib/actions/tasks";
import { PRIORITY_LABELS, PRIORITY_COLORS, type TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import type { TaskWithRelations } from "@/lib/queries/tasks";

const INITIAL_LIMIT = 5;

interface Props {
  tasks: TaskWithRelations[];
  concludedStatusId: string | null;
}

export function MyDay({ tasks, concludedStatusId }: Props) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [, startTransition] = useTransition();

  const [panelTask, setPanelTask] = useState<any | null>(null);
  const [panelComments, setPanelComments] = useState<any[]>([]);
  const [panelFormData, setPanelFormData] = useState<{
    statuses: { id: string; key: string; label: string; color: string }[];
    lists: { id: string; name: string; spaceName?: string }[];
    members: { id: string; full_name: string }[];
  } | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);

  async function handleOpenTask(taskId: string) {
    setPanelLoading(true);
    try {
      const [detail, formData] = await Promise.all([
        getTaskDetailAction(taskId),
        fetchTaskFormDataAction(),
      ]);
      setPanelTask(detail.task);
      setPanelComments(detail.comments);
      setPanelFormData({
        statuses: formData.statuses.map((s) => ({ ...s, key: "", color: "" })),
        lists: formData.lists,
        members: formData.members.map((m) => ({ id: m.id, full_name: m.label })),
      });
    } catch {
      toast.error("Erro ao carregar tarefa");
    } finally {
      setPanelLoading(false);
    }
  }

  function handleClosePanel() {
    setPanelTask(null);
    setPanelComments([]);
    setPanelFormData(null);
  }

  function handleComplete(taskId: string) {
    if (!concludedStatusId) {
      toast.error("Estado 'concluído' não encontrado");
      return;
    }
    setHidden((prev) => new Set(prev).add(taskId));
    startTransition(async () => {
      const result = await moveTaskStatusAction(taskId, concludedStatusId);
      if ("error" in result && result.error) {
        toast.error("Erro ao concluir tarefa");
        setHidden((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        return;
      }
      toast.success("Tarefa concluída");
      window.dispatchEvent(new CustomEvent("outlier:task-completed", { detail: { taskId } }));
      router.refresh();
    });
  }

  const visible = tasks.filter((t) => !hidden.has(t.id));
  const displayed = showAll ? visible : visible.slice(0, INITIAL_LIMIT);
  const remaining = visible.length - INITIAL_LIMIT;

  return (
    <div>
      <div className="border-b border-border pb-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          O Meu Dia
        </h2>
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-sm font-light text-muted-foreground">
          Sem tarefas atribuídas em aberto.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {displayed.map((task) => (
              <li key={task.id} className="flex items-start gap-3 py-3">
                <button
                  type="button"
                  onClick={() => handleComplete(task.id)}
                  className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Marcar como concluída"
                  title="Marcar como concluída"
                >
                  <CheckSquare className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenTask(task.id)}
                  disabled={panelLoading}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium tracking-[-0.01em] hover:underline">{task.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {task.priority !== "sem_prioridade" && (
                      <span className={cn("text-[11px] font-medium", PRIORITY_COLORS[task.priority as TaskPriority])}>
                        {PRIORITY_LABELS[task.priority as TaskPriority]}
                      </span>
                    )}
                    {task.client && (
                      <span className="text-[11px] text-muted-foreground/65">· {task.client.name}</span>
                    )}
                    {task.due_date && (
                      <span className="text-[11px] text-muted-foreground/65">· {task.due_date}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {!showAll && remaining > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-2 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Mostrar mais ({remaining})
            </button>
          )}
          {showAll && visible.length > INITIAL_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="mt-2 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Mostrar menos
            </button>
          )}
        </>
      )}

      {panelTask && panelFormData && (
        <TaskDetailPanel
          task={panelTask}
          comments={panelComments}
          statuses={panelFormData.statuses}
          lists={panelFormData.lists}
          members={panelFormData.members}
          onClose={handleClosePanel}
          onTaskUpdate={(field, value) => {
            setPanelTask((prev: any) => prev ? { ...prev, [field]: value } : null);
          }}
        />
      )}
    </div>
  );
}

