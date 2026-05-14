"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  startTimerAction,
  stopTimerAction,
  logTimeManualAction,
} from "@/lib/actions/tasks";
import { formatDuration, formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import type { TimeLogWithMember } from "@/lib/queries/task-detail";

interface Props {
  taskId: string;
  timeLogs: TimeLogWithMember[];
}

export function TaskTimeTracker({ taskId, timeLogs }: Props) {
  const router = useRouter();
  const running = timeLogs.find((l) => !l.end_at);
  const [isPending, startTransition] = useTransition();
  const [manualOpen, setManualOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const start = new Date(running.start_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 60000));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [running]);

  function start() {
    startTransition(async () => {
      const r = await startTimerAction(taskId);
      if ("error" in r && r.error) {
        toast.error("Erro a iniciar timer");
        return;
      }
      router.refresh();
    });
  }

  function stop() {
    if (!running) return;
    startTransition(async () => {
      const r = await stopTimerAction(running.id);
      if ("error" in r && r.error) {
        toast.error("Erro a parar timer");
        return;
      }
      toast.success(`Tempo registado: ${formatDuration(r.durationMinutes ?? 0)}`);
      router.refresh();
    });
  }

  const totalMinutes = timeLogs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Registo de Tempo · Total: {formatDuration(totalMinutes)}</CardTitle>
        <div className="flex gap-2">
          {running ? (
            <Button size="sm" variant="destructive" onClick={stop} disabled={isPending}>
              <Square className="size-3.5" />
              Parar ({formatDuration(elapsed)})
            </Button>
          ) : (
            <Button size="sm" onClick={start} disabled={isPending}>
              <Play className="size-3.5" />
              Iniciar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setManualOpen(true)}>
            <Plus className="size-3.5" />
            Manual
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {timeLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem registos de tempo.</p>
        ) : (
          <ul className="divide-y">
            {timeLogs.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {l.duration_minutes !== null ? formatDuration(l.duration_minutes) : "A correr..."}
                    {l.is_manual && <span className="ml-2 text-xs text-muted-foreground">(manual)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {l.member?.full_name ?? "—"} · {formatRelative(l.start_at)}
                  </p>
                  {l.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{l.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <ManualTimeDialog
          open={manualOpen}
          onOpenChange={setManualOpen}
          taskId={taskId}
        />
      </CardContent>
    </Card>
  );
}

function ManualTimeDialog({
  open,
  onOpenChange,
  taskId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const total = hours * 60 + minutes;
    if (total <= 0) return toast.error("Duração tem de ser > 0");
    setLoading(true);
    const r = await logTimeManualAction(taskId, total, description || undefined);
    setLoading(false);
    if ("error" in r && r.error) return toast.error("Erro");
    toast.success("Tempo registado");
    onOpenChange(false);
    setHours(0);
    setMinutes(30);
    setDescription("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registar tempo manualmente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="h">Horas</Label>
              <Input
                id="h"
                type="number"
                min={0}
                max={24}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m">Minutos</Label>
              <Input
                id="m"
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição (opcional)</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que fizeste"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "A registar..." : "Registar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
