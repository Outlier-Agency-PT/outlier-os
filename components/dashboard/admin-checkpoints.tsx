"use client";

import Link from "next/link";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEPT_LABELS: Record<string, string> = {
  trafego: "Tráfego",
  incubadora: "Incubadora",
  vendas: "Vendas",
  desenvolvimento: "Desenvolvimento",
};

const DEPARTMENTS = ["trafego", "incubadora", "vendas", "desenvolvimento"] as const;

interface CheckpointRow {
  department: string;
  status: string;
  submitted_at: string | null;
}

interface Props {
  checkpoints: (CheckpointRow | null)[];
  weekLabel: string;
}

export function AdminCheckpoints({ checkpoints, weekLabel }: Props) {
  const submittedCount = checkpoints.filter((c) => c?.status === "submitted").length;

  return (
    <div>
      <div className="border-b border-border pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Reunião Semanal
          </h2>
          <span className="text-[11px] text-muted-foreground/60">{weekLabel}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">
          {submittedCount}/{DEPARTMENTS.length} departamentos submetidos
        </p>
      </div>

      <ul className="divide-y divide-border">
        {DEPARTMENTS.map((dept, i) => {
          const cp = checkpoints[i] ?? null;
          const isSubmitted = cp?.status === "submitted";

          return (
            <li key={dept} className="flex items-center gap-3 py-3">
              <span className="flex-1 text-sm font-medium">{DEPT_LABELS[dept]}</span>
              <Badge
                variant="secondary"
                className={cn(
                  isSubmitted &&
                    "border-green-600/20 bg-green-600/10 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400",
                )}
              >
                {isSubmitted ? "Submetido" : "Rascunho"}
              </Badge>
              {isSubmitted && cp?.submitted_at && (
                <span className="shrink-0 text-[11px] text-muted-foreground/50">
                  {format(new Date(cp.submitted_at), "d MMM HH:mm", { locale: pt })}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <Link href="/reuniao-semanal">
          <Button size="sm" variant="outline">
            Ver reunião completa
          </Button>
        </Link>
      </div>
    </div>
  );
}
