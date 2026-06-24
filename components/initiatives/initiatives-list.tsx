import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn, calcularDiasRestantes } from "@/lib/utils";
import {
  INITIATIVE_STATUS_LABELS,
  INITIATIVE_STATUS_COLORS,
  INITIATIVE_PRIORITY_LABELS,
  INITIATIVE_PRIORITY_COLORS,
  INITIATIVE_SOURCE_LABELS,
} from "@/lib/types";
import type { InitiativeWithRelations } from "@/lib/queries/initiatives";
import { Flag } from "lucide-react";
import { InitiativeToggles } from "./initiative-toggles";

function SplitTitle({ title }: { title: string }) {
  const [main, ...rest] = title.split(" — ");
  return (
    <>
      <span className="block truncate font-medium">{main}</span>
      {rest.length > 0 && (
        <span className="block truncate text-[12px] font-normal text-muted-foreground">
          {rest.join(" — ")}
        </span>
      )}
    </>
  );
}

export function InitiativesList({
  initiatives,
}: {
  initiatives: InitiativeWithRelations[];
}) {
  if (initiatives.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-sm text-muted-foreground">
          Nenhuma iniciativa registada. Cria a primeira com o botão acima.
        </CardContent>
      </Card>
    );
  }

  const order = ["em_curso", "planeamento", "em_pausa", "ideia", "concluida", "cancelada"];
  const groups = order
    .map((status) => ({
      status,
      items: initiatives.filter((i) => i.status === status),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {groups.map(({ status, items }) => (
        <section key={status}>
          <div className="mb-2 flex items-baseline gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {INITIATIVE_STATUS_LABELS[status as keyof typeof INITIATIVE_STATUS_LABELS]}
            </h3>
            <span className="text-xs text-muted-foreground">({items.length})</span>
          </div>
          <div className="grid gap-2">
            {items.map((it) => (
              <div key={it.id} className="relative">
                <div className="absolute right-3 top-3 z-10">
                  <InitiativeToggles
                    id={it.id}
                    focusThisWeek={it.focus_this_week}
                    needsDecision={it.needs_decision}
                  />
                </div>
                <Link href={`/iniciativas/${it.id}`}>
                  <Card className="transition hover:border-primary/40">
                    <CardContent className="p-4 pr-24">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <SplitTitle title={it.title} />
                          {it.next_step && (
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/70">Próximo:</span>{" "}
                              {it.next_step}
                            </p>
                          )}
                          {it.blocker && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-red-500/80">
                              <Flag className="mr-1 inline size-3" />
                              {it.blocker}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {/* Status — cor própria, tamanho destacado */}
                            <span
                              className={cn(
                                "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium",
                                INITIATIVE_STATUS_COLORS[it.status],
                              )}
                            >
                              {INITIATIVE_STATUS_LABELS[it.status]}
                            </span>
                            {/* Prioridade — cor e peso visual distintos por nível */}
                            <span
                              className={cn(
                                "inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px]",
                                INITIATIVE_PRIORITY_COLORS[it.priority],
                              )}
                            >
                              {INITIATIVE_PRIORITY_LABELS[it.priority]}
                            </span>
                            <span className="inline-flex items-center rounded-sm border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                              {INITIATIVE_SOURCE_LABELS[it.source]}
                            </span>
                            {it.owner && (
                              <span className="text-[10px] text-muted-foreground">
                                · {it.owner.full_name}
                              </span>
                            )}
                            {it.client && (
                              <span className="text-[10px] text-muted-foreground">
                                · {it.client.name}
                              </span>
                            )}
                            {it.target_date && (
                              <span className="inline-flex items-center rounded-sm border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                                {calcularDiasRestantes(it.target_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
