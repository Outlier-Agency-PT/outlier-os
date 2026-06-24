import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn, calcularDiasRestantes } from "@/lib/utils";
import { DECISION_IMPACT_LABELS, type DecisionImpact } from "@/lib/types";
import type { DecisionWithRelations } from "@/lib/queries/decisions";

const IMPACT_RANK: Record<DecisionImpact, number> = {
  critico: 4,
  alto: 3,
  medio: 2,
  baixo: 1,
};

function SplitTitle({ title }: { title: string }) {
  const [main, ...rest] = title.split(" — ");
  return (
    <div className="min-w-0">
      <p className="truncate text-[15px] font-semibold tracking-[-0.02em]">{main}</p>
      {rest.length > 0 && (
        <p className="truncate text-[12px] font-normal text-muted-foreground">
          {rest.join(" — ")}
        </p>
      )}
    </div>
  );
}

export function PendingDecisions({ decisions }: { decisions: DecisionWithRelations[] }) {
  const pending = decisions
    .filter((d) => d.status === "pendente")
    .sort(
      (a, b) =>
        (IMPACT_RANK[b.impact ?? "baixo"] ?? 0) - (IMPACT_RANK[a.impact ?? "baixo"] ?? 0),
    )
    .slice(0, 5);

  const totalPending = decisions.filter((d) => d.status === "pendente").length;

  if (pending.length === 0) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-medium">Nenhuma decisão pendente</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Regista em{" "}
          <Link href="/decisoes" className="underline underline-offset-2">
            Decisões
          </Link>{" "}
          quando aparecer algo que precise de ti.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 pb-3 pt-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          À Tua Espera
        </h2>
        <div className="flex items-center gap-3">
          <Link
            href="/decisoes"
            className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            Ver todas <ArrowRight className="size-3" />
          </Link>
          <span className="text-[11px] tabular-nums text-muted-foreground/45">
            {totalPending}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {pending.map((d) => (
          <li key={d.id}>
            <Link
              href="/decisoes"
              className={cn(
                "group flex items-start justify-between gap-3 py-3 transition-colors hover:bg-muted/60",
                d.impact === "critico"
                  ? "border-l-2 border-brand pl-[14px] pr-4"
                  : "px-4",
              )}
            >
              <div className="min-w-0 flex-1">
                <SplitTitle title={d.title} />
                {d.context && (
                  <p className="mt-1.5 line-clamp-1 text-[13px] text-muted-foreground">
                    {d.context}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {d.impact && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-medium",
                        d.impact === "critico"
                          ? "border-brand/40 bg-brand/10 font-semibold uppercase tracking-[0.08em] text-brand"
                          : d.impact === "alto"
                            ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                            : "border-border bg-muted/50 text-muted-foreground",
                      )}
                    >
                      {DECISION_IMPACT_LABELS[d.impact]}
                    </span>
                  )}
                  {d.urgency && (
                    <span className="inline-flex items-center rounded-sm border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {calcularDiasRestantes(d.urgency)}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/20 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
