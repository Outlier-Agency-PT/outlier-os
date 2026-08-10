"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";
import { moveTaskStatusAction } from "@/lib/actions/tasks";
import { PRIORITY_LABELS, PRIORITY_COLORS, type TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium tracking-[-0.01em]">{task.title}</p>
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
                </div>
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
    </div>
  );
}

