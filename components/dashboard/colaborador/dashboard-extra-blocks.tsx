"use client";

import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Bell, AlertCircle, Users, TicketCheck, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type {
  DashNotification,
  DashOverdueTask,
  DashIncubadoraSummary,
  DashRenewal,
} from "@/lib/queries/dashboard-colaborador";

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
  if (tasks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <AlertCircle className="size-4 text-destructive" />
        <CardTitle className="text-base">Tarefas em Atraso</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
              <p className="min-w-0 flex-1 truncate text-sm">{t.title}</p>
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
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
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
}: {
  notifications: DashNotification[];
  unread_count: number;
  overdue_tasks: DashOverdueTask[];
  incubadora: DashIncubadoraSummary | null;
  renewals: DashRenewal[];
  hasIncubadora: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <NotificacoesCard items={notifications} unread_count={unread_count} />
      {hasIncubadora && incubadora && <IncubadoraCard summary={incubadora} />}
      {overdue_tasks.length > 0 && <TarefasAtrasadasCard tasks={overdue_tasks} />}
      {hasIncubadora && <RenovacoesCard renewals={renewals} />}
    </div>
  );
}
