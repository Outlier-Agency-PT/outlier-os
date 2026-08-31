"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Bell, AlertCircle, Users, TicketCheck, CalendarClock, Eye, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SugestoesCard } from "@/components/dashboard/sugestoes-card";
import { getTaskDetailAction, fetchTaskFormDataAction, fetchMyAllTasksAction, logTimeManualAction } from "@/lib/actions/tasks";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import type {
  DashNotification,
  DashOverdueTask,
  DashIncubadoraSummary,
  DashRenewal,
} from "@/lib/queries/dashboard-colaborador";

function todayISO() { return new Date().toISOString().slice(0, 10); }
function timeStr(d: Date) { return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function calcDurMins(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  let e = eh * 60 + em;
  if (e <= s) e += 24 * 60;
  return e - s;
}
function fmtDur(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ── Notificações Recentes ────────────────────────────────────────────────────

export function NotificacoesCard({
  items,
  unread_count,
}: {
  items: DashNotification[];
  unread_count: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Notificações</CardTitle>
        </div>
        {unread_count > 0 && (
          <Badge variant="secondary" className="text-xs">
            {unread_count} não lida{unread_count !== 1 ? "s" : ""}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem notificações recentes.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const inner = (
                <div className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${n.read ? "text-muted-foreground" : "font-medium"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {n.body.length > 80 ? n.body.slice(0, 80) + "…" : n.body}
                      </p>
                    )}
                  </div>
                  <span suppressHydrationWarning className="shrink-0 text-[11px] tabular-nums text-muted-foreground/60">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: pt })}
                  </span>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link href={n.link} className="block hover:bg-muted/30 -mx-1 px-1 rounded">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Resumo da Incubadora ─────────────────────────────────────────────────────

export function IncubadoraCard({ summary }: { summary: DashIncubadoraSummary }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Incubadora</CardTitle>
        </div>
        <Link
          href="/incubadora"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Ver tudo
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-light tabular-nums">{summary.ativos}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Ativos</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-center">
            <p className={`text-2xl font-light tabular-nums ${summary.em_risco > 0 ? "text-amber-600" : ""}`}>
              {summary.em_risco}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Em risco</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-center">
            <p className={`text-2xl font-light tabular-nums ${summary.tickets_abertos > 0 ? "text-red-600" : ""}`}>
              {summary.tickets_abertos}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Tickets</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tarefas em Atraso ────────────────────────────────────────────────────────

export function TarefasAtrasadasCard({ tasks }: { tasks: DashOverdueTask[] }) {
  const router = useRouter();

  // Detail panel
  const [panelTask, setPanelTask] = useState<any | null>(null);
  const [panelComments, setPanelComments] = useState<any[]>([]);
  const [panelFormData, setPanelFormData] = useState<{
    statuses: { id: string; key: string; label: string; color: string }[];
    lists: { id: string; name: string; spaceName?: string }[];
    members: { id: string; full_name: string }[];
  } | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);

  // Log time dialog
  const [logOpen, setLogOpen] = useState(false);
  const [allTasks, setAllTasks] = useState<{ id: string; title: string }[]>([]);
  const [logTaskId, setLogTaskId] = useState("");
  const [logStartTime, setLogStartTime] = useState(() => timeStr(new Date(Date.now() - 3600000)));
  const [logEndTime, setLogEndTime] = useState(() => timeStr(new Date()));
  const [logDate, setLogDate] = useState(todayISO());
  const [logDesc, setLogDesc] = useState("");
  const [isLogPending, startLogTransition] = useTransition();

  async function handleOpenDetail(taskId: string) {
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

  async function handleOpenLog(taskId: string) {
    setLogTaskId(taskId);
    setLogStartTime(timeStr(new Date(Date.now() - 3600000)));
    setLogEndTime(timeStr(new Date()));
    setLogDate(todayISO());
    setLogDesc("");
    setLogOpen(true);
    if (allTasks.length === 0) {
      const res = await fetchMyAllTasksAction();
      setAllTasks(res.data);
    }
  }

  function handleLogTime() {
    const durationMins = calcDurMins(logStartTime, logEndTime);
    if (!logTaskId) { toast.error("Escolhe uma tarefa"); return; }
    if (durationMins === 0) { toast.error("A duração tem de ser maior que 0"); return; }
    startLogTransition(async () => {
      const startISO = new Date(`${logDate}T${logStartTime}:00`).toISOString();
      const endISO = new Date(`${logDate}T${logEndTime}:00`).toISOString();
      const result = await logTimeManualAction(logTaskId, durationMins, logDesc || undefined, startISO, endISO);
      if ("error" in result && result.error) { toast.error("Erro ao registar tempo"); return; }
      toast.success("Tempo registado");
      setLogOpen(false);
      router.refresh();
    });
  }

  if (tasks.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <AlertCircle className="size-4 text-destructive" />
          <CardTitle className="text-base">Tarefas em Atraso</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {tasks.map((t) => (
              <li key={t.id} className="group flex items-center justify-between gap-3 py-2.5 hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                <button
                  type="button"
                  onClick={() => handleOpenDetail(t.id)}
                  disabled={panelLoading}
                  className="min-w-0 flex-1 truncate text-left text-sm cursor-pointer"
                >
                  {t.title}
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.due_date).toLocaleDateString("pt-PT", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <Badge variant="destructive" className="text-[10px]">
                    Em atraso
                  </Badge>
                  <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(t.id)}
                      disabled={panelLoading}
                      className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-foreground"
                      title="Ver detalhes"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenLog(t.id)}
                      className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-foreground"
                      title="Registar tempo"
                    >
                      <Clock className="size-3.5" />
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {panelTask && panelFormData && (
        <TaskDetailPanel
          task={panelTask}
          comments={panelComments}
          statuses={panelFormData.statuses}
          lists={panelFormData.lists}
          members={panelFormData.members}
          onClose={() => { setPanelTask(null); setPanelComments([]); setPanelFormData(null); }}
          onTaskUpdate={(field, value) => {
            setPanelTask((prev: any) => prev ? { ...prev, [field]: value } : null);
          }}
        />
      )}

      <Dialog open={logOpen} onOpenChange={(open) => { setLogOpen(open); }}>
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
                  {allTasks.map((task) => {
                    const name = task.title.length > 40 ? task.title.slice(0, 40).trimEnd() + "…" : task.title;
                    return (
                      <SelectItem key={task.id} value={task.id}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Período</Label>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Início</span>
                  <Input type="time" className="w-28" value={logStartTime} onChange={(e) => setLogStartTime(e.target.value)} />
                </div>
                <span className="mt-5 text-muted-foreground">→</span>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Fim</span>
                  <Input type="time" className="w-28" value={logEndTime} onChange={(e) => setLogEndTime(e.target.value)} />
                </div>
                {calcDurMins(logStartTime, logEndTime) > 0 && (
                  <span className="mt-5 text-sm text-muted-foreground">
                    = {fmtDur(calcDurMins(logStartTime, logEndTime))}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="overdue-log-date">Data</Label>
              <Input id="overdue-log-date" type="date" value={logDate} max={todayISO()} onChange={(e) => setLogDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="overdue-log-desc">
                Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea id="overdue-log-desc" placeholder="Em que trabalhaste?" rows={2} value={logDesc} onChange={(e) => setLogDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancelar</Button>
            <Button onClick={handleLogTime} disabled={isLogPending}>Registar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Próximas Renovações ──────────────────────────────────────────────────────

export function RenovacoesCard({ renewals }: { renewals: DashRenewal[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <CalendarClock className="size-4 text-muted-foreground" />
        <CardTitle className="text-base">Renovações (30 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        {renewals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem renovações nos próximos 30 dias.</p>
        ) : (
          <ul className="divide-y divide-border">
            {renewals.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  href={`/incubadora/${r.id}`}
                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                >
                  {r.name}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.end_date).toLocaleDateString("pt-PT", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      r.dias_restantes <= 7
                        ? "border-red-300 text-red-600"
                        : r.dias_restantes <= 14
                          ? "border-amber-300 text-amber-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    em {r.dias_restantes}d
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Grid de 4 blocos ─────────────────────────────────────────────────────────

export function DashboardExtraBlocks({
  notifications,
  unread_count,
  overdue_tasks,
  incubadora,
  renewals,
  hasIncubadora,
  isAdmin = false,
}: {
  notifications: DashNotification[];
  unread_count: number;
  overdue_tasks: DashOverdueTask[];
  incubadora: DashIncubadoraSummary | null;
  renewals: DashRenewal[];
  hasIncubadora: boolean;
  isAdmin?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <NotificacoesCard items={notifications} unread_count={unread_count} />
      {hasIncubadora && incubadora && <IncubadoraCard summary={incubadora} />}
      {overdue_tasks.length > 0 && <TarefasAtrasadasCard tasks={overdue_tasks} />}
      {hasIncubadora && <RenovacoesCard renewals={renewals} />}
      <SugestoesCard isAdmin={isAdmin} />
    </div>
  );
}
