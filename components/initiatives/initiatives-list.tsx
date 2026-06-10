import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  INITIATIVE_STATUS_LABELS,
  INITIATIVE_STATUS_COLORS,
  INITIATIVE_PRIORITY_LABELS,
  INITIATIVE_SOURCE_LABELS,
} from "@/lib/types";
import type { InitiativeWithRelations } from "@/lib/queries/initiatives";
import { AlertCircle, Flag, Star } from "lucide-react";

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

  // Agrupa por status com ordem útil
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
              <Link key={it.id} href={`/iniciativas/${it.id}`}>
                <Card className="transition hover:border-primary/40">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {it.focus_this_week && (
                            <Star className="size-4 fill-amber-400 text-amber-400" />
                          )}
                          {it.needs_decision && (
                            <AlertCircle className="size-4 text-red-500" />
                          )}
                          <h4 className="truncate font-medium">{it.title}</h4>
                        </div>
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
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              INITIATIVE_STATUS_COLORS[it.status],
                            )}
                          >
                            {INITIATIVE_STATUS_LABELS[it.status]}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {INITIATIVE_PRIORITY_LABELS[it.priority]}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {INITIATIVE_SOURCE_LABELS[it.source]}
                          </Badge>
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
                            <span className="text-[10px] text-muted-foreground">
                              · até {new Date(it.target_date).toLocaleDateString("pt-PT")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
