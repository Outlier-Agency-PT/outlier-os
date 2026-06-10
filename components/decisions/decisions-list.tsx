import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DECISION_STATUS_LABELS,
  DECISION_IMPACT_LABELS,
} from "@/lib/types";
import type { DecisionWithRelations } from "@/lib/queries/decisions";
import { AlertCircle, CheckCircle2, Clock, Archive } from "lucide-react";

const STATUS_ICONS = {
  pendente: AlertCircle,
  decidida: CheckCircle2,
  adiada: Clock,
  arquivada: Archive,
};

const IMPACT_COLORS: Record<string, string> = {
  baixo: "bg-slate-500/10 text-slate-500 border-slate-500/30",
  medio: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  alto: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  critico: "bg-red-500/10 text-red-500 border-red-500/30",
};

export function DecisionsList({
  decisions,
}: {
  decisions: DecisionWithRelations[];
}) {
  if (decisions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-sm text-muted-foreground">
          Nenhuma decisão pendente. Quando algo precisar de ti, adiciona aqui.
        </CardContent>
      </Card>
    );
  }

  const order = ["pendente", "adiada", "decidida", "arquivada"];
  const groups = order
    .map((status) => ({
      status,
      items: decisions.filter((d) => d.status === status),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {groups.map(({ status, items }) => {
        const Icon = STATUS_ICONS[status as keyof typeof STATUS_ICONS];
        return (
          <section key={status}>
            <div className="mb-2 flex items-center gap-2">
              <Icon className={cn("size-4", status === "pendente" && "text-red-500")} />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {DECISION_STATUS_LABELS[status as keyof typeof DECISION_STATUS_LABELS]}
              </h3>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            <div className="grid gap-2">
              {items.map((d) => (
                <Card key={d.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium">{d.title}</h4>
                        {d.context && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {d.context}
                          </p>
                        )}
                        {d.options && (
                          <p className="mt-2 whitespace-pre-line text-xs text-foreground/80">
                            <span className="font-medium">Opções:</span> {d.options}
                          </p>
                        )}
                        {d.decision && (
                          <p className="mt-2 rounded bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                            <span className="font-medium">Decisão:</span> {d.decision}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {d.impact && (
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", IMPACT_COLORS[d.impact])}
                            >
                              {DECISION_IMPACT_LABELS[d.impact]}
                            </Badge>
                          )}
                          {d.urgency && (
                            <Badge variant="secondary" className="text-[10px]">
                              {d.urgency}
                            </Badge>
                          )}
                          {d.initiative && (
                            <span className="text-[10px] text-muted-foreground">
                              · Iniciativa: {d.initiative.title}
                            </span>
                          )}
                          {d.client && (
                            <span className="text-[10px] text-muted-foreground">
                              · Cliente: {d.client.name}
                            </span>
                          )}
                          {d.mentorship && (
                            <span className="text-[10px] text-muted-foreground">
                              · Mentoria: {d.mentorship.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
