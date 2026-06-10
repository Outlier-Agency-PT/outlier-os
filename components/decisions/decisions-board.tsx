"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle, CheckCircle2, Clock, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DecisionForm } from "./decision-form";
import { recordDecisionAction, deleteDecisionAction } from "@/lib/actions/decisions";
import {
  DECISION_STATUS_LABELS,
  DECISION_IMPACT_LABELS,
  type DecisionImpact,
  type DecisionStatus,
} from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import type { DecisionWithRelations } from "@/lib/queries/decisions";

interface Props {
  decisions: DecisionWithRelations[];
  initiatives: { id: string; title: string }[];
  clients: { id: string; name: string }[];
  mentorships: { id: string; name: string }[];
}

const IMPACT_COLORS: Record<DecisionImpact, string> = {
  critico: "border-red-500/50 text-red-600",
  alto: "border-orange-500/50 text-orange-600",
  medio: "border-amber-500/50 text-amber-600",
  baixo: "border-slate-500/50 text-slate-600",
};

const STATUS_ICONS: Record<DecisionStatus, React.ReactNode> = {
  pendente: <AlertTriangle className="size-4 text-amber-500" />,
  decidida: <CheckCircle2 className="size-4 text-green-500" />,
  adiada: <Clock className="size-4 text-muted-foreground" />,
  arquivada: <Archive className="size-4 text-muted-foreground" />,
};

const STATUS_ORDER: DecisionStatus[] = ["pendente", "decidida", "adiada", "arquivada"];

export function DecisionsBoard({ decisions, initiatives, clients, mentorships }: Props) {
  const [open, setOpen] = useState(false);

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: decisions.filter((d) => d.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <div className="flex items-center justify-between border-b px-8 py-4">
        <p className="text-sm text-muted-foreground">
          {decisions.filter((d) => d.status === "pendente").length} pendentes ·{" "}
          {decisions.filter((d) => d.status === "decidida").length} decididas ·{" "}
          {decisions.length} total
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Nova Decisão
        </Button>
      </div>

      <div className="space-y-6 p-8">
        {decisions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              Sem decisões registadas. Cria a primeira para começar o decision log.
            </CardContent>
          </Card>
        ) : (
          grouped.map(({ status, items }) => (
            <section key={status}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {STATUS_ICONS[status]}
                {DECISION_STATUS_LABELS[status]} <span className="text-xs">({items.length})</span>
              </h2>
              <div className="space-y-3">
                {items.map((d) => <DecisionCard key={d.id} decision={d} />)}
              </div>
            </section>
          ))
        )}
      </div>

      <DecisionForm
        open={open}
        onOpenChange={setOpen}
        initiatives={initiatives}
        clients={clients}
        mentorships={mentorships}
      />
    </>
  );
}

function DecisionCard({ decision }: { decision: DecisionWithRelations }) {
  const [recordOpen, setRecordOpen] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    if (!confirm(`Eliminar decisão "${decision.title}"?`)) return;
    startTransition(async () => {
      await deleteDecisionAction(decision.id);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium">{decision.title}</h3>
              {decision.impact && (
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", IMPACT_COLORS[decision.impact])}
                >
                  Impacto: {DECISION_IMPACT_LABELS[decision.impact]}
                </Badge>
              )}
              {decision.urgency && (
                <Badge variant="secondary" className="text-[10px]">
                  ⏰ {decision.urgency}
                </Badge>
              )}
            </div>

            {decision.context && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {decision.context}
              </p>
            )}

            {decision.options && (
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Opções
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{decision.options}</p>
              </div>
            )}

            {decision.status === "decidida" && decision.decision && (
              <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700">
                  ✓ Decidido {decision.decided_at && formatRelative(decision.decided_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{decision.decision}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {decision.initiative && <span>📌 {decision.initiative.title}</span>}
              {decision.client && <span>🏢 {decision.client.name}</span>}
              {decision.mentorship && <span>🎓 {decision.mentorship.name}</span>}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            {decision.status === "pendente" && (
              <Button size="sm" onClick={() => setRecordOpen(true)}>
                Decidir
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isPending}>
              Eliminar
            </Button>
          </div>
        </div>
      </CardContent>

      <RecordDialog open={recordOpen} onOpenChange={setRecordOpen} decision={decision} />
    </Card>
  );
}

function RecordDialog({
  open,
  onOpenChange,
  decision,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  decision: DecisionWithRelations;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    const r = await recordDecisionAction(decision.id, text);
    setLoading(false);
    if ("error" in r && r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Decisão registada");
    onOpenChange(false);
    setText("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decidir: {decision.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="O que decidiste e porquê"
            required
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !text.trim()}>
              {loading ? "A registar..." : "Registar Decisão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
