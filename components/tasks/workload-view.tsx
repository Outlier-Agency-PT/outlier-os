"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarDisplay } from "@/components/avatar-display";
import { getWorkloadAction } from "@/lib/actions/tasks";
import type { WorkloadMember } from "@/lib/queries/tasks";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekLabel(): string {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const months = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];

  if (monday.getMonth() === friday.getMonth()) {
    return `Semana de ${monday.getDate()} a ${friday.getDate()} ${months[friday.getMonth()]}`;
  }
  return `Semana de ${monday.getDate()} ${months[monday.getMonth()]} a ${friday.getDate()} ${months[friday.getMonth()]}`;
}

function fmt(h: number): string {
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkloadView() {
  const [data, setData] = useState<WorkloadMember[] | null>(null);

  useEffect(() => {
    getWorkloadAction().then(setData);
  }, []);

  const weekLabel = getWeekLabel();

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Carga de Trabalho</h2>
        <Badge variant="outline" className="rounded-full text-xs font-normal">
          {weekLabel}
        </Badge>
      </div>

      {/* Loading */}
      {data === null && (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          A carregar...
        </div>
      )}

      {/* Empty */}
      {data !== null && data.length === 0 && (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Nenhuma tarefa atribuída esta semana.
        </div>
      )}

      {/* Member cards */}
      {data !== null && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((m) => {
            const hasNoTasks = m.task_count === 0;
            const isOverEstimate = !hasNoTasks && m.logged_hours > m.estimated_hours;
            const progressPct = hasNoTasks
              ? 0
              : Math.min(100, Math.round((m.logged_hours / m.estimated_hours) * 100));

            return (
              <div
                key={m.member_id}
                className="rounded-lg border bg-card p-5 space-y-4"
              >
                {/* Avatar + Nome */}
                <div className="flex items-center gap-3">
                  <AvatarDisplay name={m.member_name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.member_name}</p>
                    {hasNoTasks ? (
                      <Badge
                        variant="secondary"
                        className="mt-0.5 rounded-full text-[10px] font-normal"
                      >
                        Sem tarefas atribuídas
                      </Badge>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {m.task_count} {m.task_count === 1 ? "tarefa aberta" : "tarefas abertas"}
                      </p>
                    )}
                  </div>
                </div>

                {!hasNoTasks && (
                  <>
                    {/* Barra de progresso dupla */}
                    <div className="space-y-1.5">
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all"
                          style={{
                            width: `${progressPct}%`,
                            backgroundColor: isOverEstimate ? "#dc2626" : "#A12B2B",
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={
                            isOverEstimate ? "font-medium text-red-600" : "text-muted-foreground"
                          }
                        >
                          {fmt(m.logged_hours)} registadas
                        </span>
                        <span className="text-muted-foreground">
                          de {fmt(m.estimated_hours)} estimadas
                        </span>
                      </div>
                    </div>

                    {/* Alerta de sobrecarga */}
                    {isOverEstimate && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        Acima da estimativa
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
