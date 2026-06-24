import Link from "next/link";
import { Flag, ArrowRight } from "lucide-react";
import { INITIATIVE_STATUS_LABELS, INITIATIVE_STATUS_COLORS, INITIATIVE_PRIORITY_LABELS, INITIATIVE_PRIORITY_COLORS } from "@/lib/types";
import type { InitiativeWithRelations } from "@/lib/queries/initiatives";
import { cn } from "@/lib/utils";

function SplitTitle({ title, className }: { title: string; className?: string }) {
  const [main, ...rest] = title.split(" — ");
  return (
    <div className="min-w-0 flex-1">
      <p className={cn("truncate", className)}>{main}</p>
      {rest.length > 0 && (
        <p className="truncate text-[12px] font-normal text-muted-foreground">
          {rest.join(" — ")}
        </p>
      )}
    </div>
  );
}

export function FocusWeek({ initiatives }: { initiatives: InitiativeWithRelations[] }) {
  if (initiatives.length === 0) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-medium">Sem foco definido</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Vai a{" "}
          <Link href="/iniciativas" className="underline underline-offset-2">
            Iniciativas
          </Link>{" "}
          e assinala o foco desta semana.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 pb-3 pt-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Foco da Semana
        </h2>
        <Link
          href="/iniciativas"
          className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          Ver todas <ArrowRight className="size-3" />
        </Link>
      </div>

      <ul className="divide-y divide-border">
        {initiatives.map((it) => (
          <li key={it.id}>
            <Link
              href={`/iniciativas/${it.id}`}
              className="group flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <SplitTitle
                    title={it.title}
                    className="text-[15px] font-semibold tracking-[-0.02em]"
                  />
                  {it.needs_decision && (
                    <span className="mt-0.5 shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-brand">
                      Decisão
                    </span>
                  )}
                </div>
                {it.next_step && (
                  <p className="mt-1.5 line-clamp-1 text-[13px] text-muted-foreground">
                    {it.next_step}
                  </p>
                )}
                {it.blocker && (
                  <p className="mt-1 line-clamp-1 text-[13px] text-brand/75">
                    <Flag className="mr-1 inline size-3" />
                    {it.blocker}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-medium",
                      INITIATIVE_STATUS_COLORS[it.status],
                    )}
                  >
                    {INITIATIVE_STATUS_LABELS[it.status]}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px]",
                      INITIATIVE_PRIORITY_COLORS[it.priority],
                    )}
                  >
                    {INITIATIVE_PRIORITY_LABELS[it.priority]}
                  </span>
                  {it.owner && (
                    <span className="text-[11px] text-muted-foreground/65">
                      · {it.owner.full_name}
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
