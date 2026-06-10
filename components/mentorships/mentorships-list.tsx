import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MENTORSHIP_STATUS_LABELS } from "@/lib/types";
import type { MentorshipWithStats } from "@/lib/queries/mentorships";

export function MentorshipsList({
  mentorships,
}: {
  mentorships: MentorshipWithStats[];
}) {
  if (mentorships.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-sm text-muted-foreground">
          Nenhuma mentoria registada. Adiciona Core IA, Venda Todo Santo Dia, Stories 10x para começar.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {mentorships.map((m) => {
        const consumedPct =
          m.modules_count > 0
            ? Math.round((m.modules_consumed / m.modules_count) * 100)
            : 0;
        const implementedPct =
          m.actions_total > 0
            ? Math.round((m.actions_implemented / m.actions_total) * 100)
            : 0;
        return (
          <Link key={m.id} href={`/mentorias/${m.id}`}>
            <Card className="h-full transition hover:border-primary/40">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{m.cover_emoji}</span>
                      <h3 className="truncate font-semibold">{m.name}</h3>
                    </div>
                    {m.mentor && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        por <span className="text-foreground">{m.mentor}</span>
                        {m.platform && <span> · {m.platform}</span>}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {MENTORSHIP_STATUS_LABELS[m.status]}
                  </Badge>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Consumido</span>
                      <span className="font-medium">
                        {m.modules_consumed}/{m.modules_count} ({consumedPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${consumedPct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Implementado</span>
                      <span className="font-medium">
                        {m.actions_implemented}/{m.actions_total} ({implementedPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${implementedPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
