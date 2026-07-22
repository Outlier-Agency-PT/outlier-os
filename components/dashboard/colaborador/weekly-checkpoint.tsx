import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { addDays, format } from "date-fns";
import { pt } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUserDepartments, getWeeklyCheckpoints } from "@/lib/actions/checkpoints";
import { getWeekStart } from "@/lib/utils/week-utils";

const DEPT_LABELS: Record<string, string> = {
  trafego: "Tráfego",
  incubadora: "Incubadora",
  vendas: "Vendas",
  desenvolvimento: "Desenvolvimento",
};

const DEPARTMENTS = ["trafego", "incubadora", "vendas", "desenvolvimento"];

const SUMMARY_FIELDS: Record<string, { key: string; label: string }[]> = {
  incubadora: [
    { key: "active_students", label: "Ativos" },
    { key: "students_at_risk", label: "Em risco" },
    { key: "critical_cases", label: "Tickets abertos" },
  ],
  desenvolvimento: [
    { key: "tasks_completed", label: "Concluídas" },
    { key: "tasks_open", label: "Abertas" },
    { key: "tasks_overdue", label: "Em atraso" },
  ],
  trafego: [
    { key: "ad_spend", label: "Investimento (€)" },
    { key: "leads_generated", label: "Leads geradas" },
    { key: "qualified_leads", label: "Leads qualificadas" },
  ],
  vendas: [
    { key: "new_leads", label: "Leads novas" },
    { key: "mql", label: "MQL" },
    { key: "sql", label: "SQL" },
  ],
};

export async function CheckpointSummaryCard() {
  const weekStart = getWeekStart();
  const departments = await getUserDepartments();
  const primaryDept = departments[0] ?? null;

  const weekLabel = `${format(weekStart, "d 'de' MMMM", { locale: pt })} a ${format(addDays(weekStart, 4), "d 'de' MMMM", { locale: pt })}`;

  if (!primaryDept) {
    return (
      <div>
        <div className="border-b border-border pb-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Reunião Semanal
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">{weekLabel}</p>
        </div>
        <div className="py-4">
          <Link href="/reuniao-semanal">
            <Button size="sm" variant="outline">
              <CalendarCheck className="mr-2 size-3.5" />
              Ir para Reunião Semanal
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const allCheckpoints = await getWeeklyCheckpoints(weekStart);
  const deptIndex = DEPARTMENTS.indexOf(primaryDept);
  const checkpoint = deptIndex >= 0 ? allCheckpoints[deptIndex] : null;
  const metrics = (checkpoint?.metrics ?? {}) as Record<string, unknown>;
  const isSubmitted = checkpoint?.status === "submitted";
  const summaryFields = SUMMARY_FIELDS[primaryDept] ?? [];

  return (
    <div>
      <div className="border-b border-border pb-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Reunião Semanal · {DEPT_LABELS[primaryDept] ?? primaryDept}
          </h2>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px]",
              isSubmitted &&
                "border-green-600/20 bg-green-600/10 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400",
            )}
          >
            {isSubmitted ? "Submetido" : "Rascunho"}
          </Badge>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">{weekLabel}</p>
      </div>

      <div className="py-4 space-y-4">
        {summaryFields.length > 0 && checkpoint && (
          <div className="grid grid-cols-3 gap-3">
            {summaryFields.map((f) => (
              <div key={f.key}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  {f.label}
                </p>
                <p className="text-xl font-light tabular-nums">
                  {metrics[f.key] !== undefined ? String(metrics[f.key]) : "—"}
                </p>
              </div>
            ))}
          </div>
        )}

        {!checkpoint && (
          <p className="text-sm font-light text-muted-foreground">
            Nenhum checkpoint registado esta semana.
          </p>
        )}

        <Link href="/reuniao-semanal">
          <Button size="sm" variant="outline" className="w-full">
            <CalendarCheck className="mr-2 size-3.5" />
            Ir para Reunião Semanal
          </Button>
        </Link>
      </div>
    </div>
  );
}
