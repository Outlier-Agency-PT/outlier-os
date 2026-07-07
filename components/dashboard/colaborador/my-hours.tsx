"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startTimerAction, stopTimerAction } from "@/lib/actions/tasks";
import { formatDuration, formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/lib/queries/tasks";
import type { TimeLogWithTask } from "@/lib/queries/dashboard-colaborador";

interface Props {
  weekMinutes: number;
  runningLog: TimeLogWithTask | null;
  recentLogs: TimeLogWithTask[];
  myDayTasks: TaskWithRelations[];
}

export function MyHours({ weekMinutes, runningLog, recentLogs, myDayTasks }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTaskId, setSelectedTaskId] = useState<string>(myDayTasks[0]?.id ?? "");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!runningLog) return;
    const start = new Date(runningLog.start_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 60000));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [runningLog]);

  function handleStart() {
    if (!selectedTaskId) {
      toast.error("Escolhe uma tarefa");
      return;
    }
    startTransition(async () => {
      const result = await startTimerAction(selectedTaskId);
      if ("error" in result && result.error) {
        toast.error("Erro ao iniciar timer");
        return;
      }
      router.refresh();
    });
  }

  function handleStop() {
    if (!runningLog) return;
    startTransition(async () => {
      const result = await stopTimerAction(runningLog.id);
      if ("error" in result && result.error) {
        toast.error("Erro ao parar timer");
        return;
      }
      toast.success(`Tempo registado: ${formatDuration(result.durationMinutes ?? 0)}`);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          As Minhas Horas
        </h2>
        <span className="text-[11px] tabular-nums text-muted-foreground/65">
          {formatDuration(weekMinutes)} esta semana
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 py-4">
        {runningLog ? (
          <Button size="sm" variant="destructive" onClick={handleStop} disabled={isPending}>
            <Square className="size-3.5" />
            Parar {runningLog.task ? `· ${runningLog.task.title}` : ""} ({formatDuration(elapsed)})
          </Button>
        ) : (
          <>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger className="h-8 w-56 text-xs">
                <SelectValue placeholder="Escolhe uma tarefa" />
              </SelectTrigger>
              <SelectContent>
                {myDayTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleStart} disabled={isPending || !selectedTaskId}>
              <Play className="size-3.5" />
              Iniciar timer
            </Button>
          </>
        )}
      </div>

      {recentLogs.length === 0 ? (
        <p className="pb-4 text-sm font-light text-muted-foreground">Sem registos de tempo ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {recentLogs.map((log) => (
            <li key={log.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium tracking-[-0.01em]">{log.task?.title ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground/65">{formatRelative(log.start_at)}</p>
              </div>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {log.duration_minutes !== null ? formatDuration(log.duration_minutes) : "A correr..."}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
