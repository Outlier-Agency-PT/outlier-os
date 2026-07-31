"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getTodayTasksAction, markTaskDoneAction } from "@/lib/actions/tasks";
import type { TodayTask } from "@/lib/queries/dashboard-colaborador";

const PRIORITY_STYLES: Record<TodayTask["priority"], string> = {
  urgente: "border-red-500 text-red-600 bg-red-50",
  alta: "border-orange-500 text-orange-600 bg-orange-50",
  media: "border-yellow-500 text-yellow-600 bg-yellow-50",
  baixa: "border-blue-400 text-blue-500 bg-blue-50",
  sem_prioridade: "border-gray-300 text-gray-400 bg-gray-50",
};

const PRIORITY_LABELS: Record<TodayTask["priority"], string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  sem_prioridade: "—",
};

interface Props {
  memberId: string;
}

export function TodayTasks({ memberId }: Props) {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTodayTasksAction(memberId);
        if (!cancelled) setTasks(data);
      } catch {
        if (!cancelled) setError("Não foi possível carregar as tarefas.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [memberId, retryCount]);

  async function handleComplete(taskId: string) {
    setCompleting((prev) => new Set(prev).add(taskId));
    const result = await markTaskDoneAction(taskId);
    if (result?.error) {
      setCompleting((prev) => {
        const s = new Set(prev);
        s.delete(taskId);
        return s;
      });
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setCompleting((prev) => {
        const s = new Set(prev);
        s.delete(taskId);
        return s;
      });
      window.dispatchEvent(new CustomEvent("outlier:task-completed", { detail: { taskId } }));
    }
  }

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Tarefas de Hoje
        </span>
        {!loading && tasks.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Tentar novamente
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sem tarefas para hoje 🎉
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 py-1">
              <input
                type="checkbox"
                checked={completing.has(task.id)}
                onChange={() => handleComplete(task.id)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-foreground"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm leading-tight",
                    completing.has(task.id) && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn("px-1.5 py-0 text-xs", PRIORITY_STYLES[task.priority])}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </Badge>
                  {task.status && (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-xs"
                      style={{
                        borderColor: task.status.color,
                        color: task.status.color,
                      }}
                    >
                      {task.status.label}
                    </Badge>
                  )}
                  {task.estimate_points != null && (
                    <span className="text-xs text-muted-foreground">
                      ~{task.estimate_points}h
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
