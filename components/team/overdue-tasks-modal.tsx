"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OverdueTask } from "@/lib/queries/team-metrics";

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: OverdueTask[];
}

export function OverdueTasksModal({ open, onClose, tasks }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tarefas em Atraso</DialogTitle>
        </DialogHeader>

        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma tarefa em atraso.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="pb-2 pr-4 text-left">Tarefa</th>
                  <th className="pb-2 pr-4 text-left">Responsável</th>
                  <th className="pb-2 pr-4 text-left">Prazo</th>
                  <th className="pb-2 text-right">Dias em Atraso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 pr-4 font-light leading-snug">{t.title}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {t.assignee_name ?? <span className="opacity-40">—</span>}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                      {new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-PT", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-medium text-red-500">
                      {t.days_overdue}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
