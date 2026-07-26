"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Plus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  startTimerAction,
  stopTimerAction,
  logTimeManualAction,
  fetchMyOpenTasksAction,
  fetchMyAllTasksAction,
} from "@/lib/actions/tasks";
import { formatDuration, formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/lib/queries/tasks";
import type { TimeLogWithTask } from "@/lib/queries/dashboard-colaborador";

interface SimpleTask {
  id: string;
  title: string;
  completed_at?: string | null;
}

interface Props {
  weekMinutes: number;
  runningLog: TimeLogWithTask | null;
  recentLogs: TimeLogWithTask[];
  myDayTasks: TaskWithRelations[];
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function MyHours({ weekMinutes, runningLog, recentLogs, myDayTasks }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLogPending, startLogTransition] = useTransition();

  // Timer
  const [timerTasks, setTimerTasks] = useState<SimpleTask[]>(myDayTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(myDayTasks[0]?.id ?? "");
  const [elapsed, setElapsed] = useState(0);

  // Manual log dialog
  const [logOpen, setLogOpen] = useState(false);
  const [allTasks, setAllTasks] = useState<SimpleTask[]>([]);
  const [logTaskId, setLogTaskId] = useState("");
  const [logHours, setLogHours] = useState<number | "">(0);
  const [logMins, setLogMins] = useState("0");
  const [logDate, setLogDate] = useState(todayISO());
  const [logDesc, setLogDesc] = useState("");

  // Fetch fresh open tasks for timer on mount (fixes dropdown showing only 1 task)
  useEffect(() => {
    fetchMyOpenTasksAction().then((res) => {
      if (res.data.length > 0) {
        setTimerTasks(res.data);
        setSelectedTaskId((prev) => {
          const ids = new Set(res.data.map((t) => t.id));
          return ids.has(prev) ? prev : (res.data[0]?.id ?? "");
        });
      }
    });
  }, []);

  // Fetch all tasks (open + concluded) when dialog opens
  useEffect(() => {
    if (!logOpen) return;
    fetchMyAllTasksAction().then((res) => {
      if (res.data.length > 0) setAllTasks(res.data);
    });
  }, [logOpen]);

  // Elapsed ticker for running log
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

  function resetLogForm() {
    setLogTaskId("");
    setLogHours(0);
    setLogMins("0");
    setLogDate(todayISO());
    setLogDesc("");
  }

  function handleLogTime() {
    const h = typeof logHours === "number" ? logHours : 0;
    const totalMins = h * 60 + parseInt(logMins, 10);
    if (!logTaskId) {
      toast.error("Escolhe uma tarefa");
      return;
    }
    if (totalMins === 0) {
      toast.error("A duração tem de ser maior que 0");
      return;
    }
    startLogTransition(async () => {
      const result = await logTimeManualAction(
        logTaskId,
        totalMins,
        logDesc || undefined,
        logDate,
      );
      if ("error" in result && result.error) {
        toast.error("Erro ao registar tempo");
        return;
      }
      toast.success("Tempo registado");
      setLogOpen(false);
      resetLogForm();
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          As Minhas Horas
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLogOpen(true)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/65 transition-colors hover:text-foreground"
          >
            <Plus className="size-3" />
            Registar tempo
          </button>
          <span className="text-[11px] tabular-nums text-muted-foreground/65">
            {formatDuration(weekMinutes)} esta semana
          </span>
        </div>
      </div>

      {/* Timer */}
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
                {timerTasks.map((task) => (
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

      {/* Recent logs */}
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

      {/* Manual log dialog */}
      <Dialog
        open={logOpen}
        onOpenChange={(open) => {
          setLogOpen(open);
          if (!open) resetLogForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registar tempo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tarefa</Label>
              <Select value={logTaskId} onValueChange={setLogTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolhe uma tarefa" />
                </SelectTrigger>
                <SelectContent>
                  {allTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Duração</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-20"
                    value={logHours}
                    onChange={(e) =>
                      setLogHours(
                        e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10)),
                      )
                    }
                  />
                  <span className="text-sm text-muted-foreground">h</span>
                </div>
                <Select value={logMins} onValueChange={setLogMins}>
                  <SelectTrigger className="w-24">
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

            <div className="space-y-1.5">
              <Label htmlFor="log-date">Data</Label>
              <Input
                id="log-date"
                type="date"
                value={logDate}
                max={todayISO()}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="log-desc">
                Descrição{" "}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="log-desc"
                placeholder="Em que trabalhaste?"
                rows={2}
                value={logDesc}
                onChange={(e) => setLogDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLogTime} disabled={isLogPending}>
              Registar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
