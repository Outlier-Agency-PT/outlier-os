"use client";

import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type Department = "trafego" | "incubadora" | "vendas" | "desenvolvimento";

const DEPT_LABELS: Record<Department, string> = {
  trafego: "Tráfego",
  incubadora: "Incubadora",
  vendas: "Vendas",
  desenvolvimento: "Desenvolvimento",
};

interface FieldDef {
  key: string;
  label: string;
}

const AUTO_FIELDS: Record<Department, FieldDef[]> = {
  trafego: [],
  incubadora: [
    { key: "active_students", label: "Alunos ativos" },
    { key: "students_at_risk", label: "Em risco (+7 dias)" },
    { key: "imminent_dropout", label: "Abandono iminente (+14 dias)" },
    { key: "new_student_revenue", label: "Receita nova (€)" },
    { key: "level_progressions", label: "Progressões de nível" },
    { key: "critical_cases", label: "Tickets abertos" },
  ],
  vendas: [],
  desenvolvimento: [
    { key: "tasks_completed", label: "Tarefas concluídas" },
    { key: "tasks_open", label: "Tarefas abertas" },
    { key: "tasks_overdue", label: "Tarefas em atraso" },
    { key: "critical_incidents_open", label: "Incidentes abertos" },
  ],
};

const MANUAL_FIELDS: Record<Department, FieldDef[]> = {
  trafego: [
    { key: "ad_spend", label: "Investimento (€)" },
    { key: "leads_generated", label: "Leads geradas" },
    { key: "qualified_leads", label: "Leads qualificadas" },
    { key: "meetings_booked", label: "Reuniões marcadas" },
    { key: "sales_attributed", label: "Vendas atribuídas" },
    { key: "revenue_attributed", label: "Receita atribuída (€)" },
    { key: "campaigns_launched", label: "Criativos lançados" },
  ],
  incubadora: [
    { key: "coaching_interactions", label: "Sessões realizadas" },
  ],
  vendas: [
    { key: "new_leads", label: "Leads novas" },
    { key: "mql", label: "MQL" },
    { key: "sql", label: "SQL" },
    { key: "meetings_held", label: "Reuniões realizadas" },
    { key: "sales_closed", label: "Vendas fechadas" },
    { key: "no_shows", label: "No-shows" },
    { key: "follow_up_open", label: "Em follow-up" },
  ],
  desenvolvimento: [
    { key: "releases_published", label: "Releases publicados" },
    { key: "bugs_fixed", label: "Bugs corrigidos" },
    { key: "critical_incidents", label: "Incidentes críticos" },
  ],
};

function safeDiv(num: number, den: number, suffix = ""): string {
  if (den === 0 || isNaN(num) || isNaN(den)) return "—";
  return (num / den).toFixed(2) + suffix;
}

function safePct(num: number, den: number): string {
  if (den === 0 || isNaN(num) || isNaN(den)) return "—";
  return ((num / den) * 100).toFixed(1) + "%";
}

function getCalculated(
  department: Department,
  metrics: Record<string, number>,
): { label: string; value: string }[] {
  const n = (k: string) => Number(metrics[k] ?? 0);

  if (department === "trafego") {
    return [
      { label: "CPL", value: "€" + safeDiv(n("ad_spend"), n("leads_generated")) },
      { label: "Custo/lead qualificada", value: "€" + safeDiv(n("ad_spend"), n("qualified_leads")) },
      { label: "Custo/reunião", value: "€" + safeDiv(n("ad_spend"), n("meetings_booked")) },
    ];
  }
  if (department === "vendas") {
    return [
      { label: "Taxa MQL", value: safePct(n("mql"), n("new_leads")) },
      { label: "Taxa SQL", value: safePct(n("sql"), n("new_leads")) },
      { label: "Show-up", value: safePct(n("meetings_held") - n("no_shows"), n("meetings_held")) },
      { label: "Conversão reunião→venda", value: safePct(n("sales_closed"), n("meetings_held")) },
    ];
  }
  return [];
}

interface CheckpointRow {
  id: string;
  status: string;
  submitted_at: string | null;
  notes: string | null;
  metrics: Record<string, unknown>;
}

interface Props {
  department: Department;
  checkpoint: CheckpointRow | null;
  autoMetrics: Record<string, number>;
  canEdit: boolean;
  onSave: (metrics: Record<string, number | string>, notes?: string) => Promise<void>;
  onSubmit: () => Promise<void>;
}

export function CheckpointCard({
  department,
  checkpoint,
  autoMetrics,
  canEdit,
  onSave,
  onSubmit,
}: Props) {
  const isSubmitted = checkpoint?.status === "submitted";
  const editable = canEdit && !isSubmitted;

  const [manualValues, setManualValues] = useState<Record<string, string>>(() => {
    const m = (checkpoint?.metrics ?? {}) as Record<string, unknown>;
    return Object.fromEntries(
      MANUAL_FIELDS[department].map((f) => [
        f.key,
        m[f.key] !== undefined ? String(m[f.key]) : "",
      ]),
    );
  });

  const [notes, setNotes] = useState(checkpoint?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentMetrics: Record<string, number> = {
    ...autoMetrics,
    ...Object.fromEntries(
      Object.entries(manualValues)
        .filter(([, v]) => v !== "")
        .map(([k, v]) => [k, Number(v)]),
    ),
  };

  const calculated = getCalculated(department, currentMetrics);
  const autoFields = AUTO_FIELDS[department];
  const manualFields = MANUAL_FIELDS[department];

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(currentMetrics, notes || undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSave(currentMetrics, notes || undefined);
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{DEPT_LABELS[department]}</CardTitle>
          <Badge
            variant="secondary"
            className={cn(
              isSubmitted &&
                "border-green-600/20 bg-green-600/10 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400",
            )}
          >
            {isSubmitted ? "Submetido" : "Rascunho"}
          </Badge>
        </div>
        {isSubmitted && checkpoint?.submitted_at && (
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(checkpoint.submitted_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Métricas automáticas */}
        {autoFields.length > 0 && (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
              Calculado automaticamente
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {autoFields.map((f) => (
                <div key={f.key}>
                  <p className="text-[10px] text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-medium tabular-nums">
                    {autoMetrics[f.key] !== undefined ? String(autoMetrics[f.key]) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campos manuais */}
        {manualFields.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {manualFields.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-[11px] text-muted-foreground">{f.label}</label>
                <Input
                  type="number"
                  min={0}
                  value={manualValues[f.key] ?? ""}
                  onChange={(e) =>
                    setManualValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                  disabled={!editable}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* Calculados */}
        {calculated.length > 0 && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {calculated.map((c) => (
                <div key={c.label}>
                  <p className="text-[10px] text-muted-foreground">{c.label}</p>
                  <p className="text-sm font-medium tabular-nums">{c.value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Notas / alerta */}
        <Separator />
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">
            Alerta / Bloqueio
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!editable}
            maxLength={300}
            placeholder="Alerta ou bloqueio que exige decisão da equipa"
            rows={2}
            className="text-sm"
          />
          {editable && (
            <p className="mt-0.5 text-right text-[10px] text-muted-foreground/50">
              {notes.length}/300
            </p>
          )}
        </div>

        {/* Botões */}
        {editable && (
          <div className="mt-auto flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={saving || submitting}
              className="flex-1"
            >
              {saving ? "A guardar..." : "Guardar rascunho"}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={saving || submitting}
              className="flex-1"
            >
              {submitting ? "A submeter..." : "Submeter"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
