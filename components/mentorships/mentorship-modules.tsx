"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createModuleAction,
  markModuleConsumedAction,
} from "@/lib/actions/mentorships";
import { formatDate, formatDuration } from "@/lib/utils";
import { toast } from "sonner";
import type { MentorshipModule } from "@/lib/types";

interface Props {
  mentorshipId: string;
  modules: MentorshipModule[];
}

export function MentorshipModules({ mentorshipId, modules }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [insightsFor, setInsightsFor] = useState<MentorshipModule | null>(null);

  const consumed = modules.filter((m) => m.consumed_at).length;
  const progress = modules.length > 0 ? Math.round((consumed / modules.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Módulos · {consumed}/{modules.length} ({progress}%)
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem módulos. Adiciona-os à medida que avanças.
          </p>
        ) : (
          <ul className="space-y-2">
            {modules.map((m) => (
              <li
                key={m.id}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <button
                  onClick={() => !m.consumed_at && setInsightsFor(m)}
                  disabled={!!m.consumed_at}
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-accent disabled:cursor-default"
                  title={m.consumed_at ? "Concluído" : "Marcar como consumido"}
                >
                  {m.consumed_at ? (
                    <Check className="size-3.5 text-green-600" />
                  ) : (
                    <Clock className="size-3.5 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1">
                  <p className={m.consumed_at ? "text-sm font-medium" : "text-sm font-medium"}>
                    {m.title}
                  </p>
                  {m.duration_minutes && (
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(m.duration_minutes)}
                    </p>
                  )}
                  {m.consumed_at && (
                    <p className="text-xs text-muted-foreground">
                      Concluído em {formatDate(m.consumed_at)}
                    </p>
                  )}
                  {m.key_insights && (
                    <div className="mt-2 rounded-md border bg-muted/30 p-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Key insights
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-xs">{m.key_insights}</p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <CreateModuleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mentorshipId={mentorshipId}
        nextOrder={modules.length}
      />
      {insightsFor && (
        <ConsumeDialog
          module={insightsFor}
          mentorshipId={mentorshipId}
          onClose={() => setInsightsFor(null)}
        />
      )}
    </Card>
  );
}

function CreateModuleDialog({
  open,
  onOpenChange,
  mentorshipId,
  nextOrder,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mentorshipId: string;
  nextOrder: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await createModuleAction({
      mentorship_id: mentorshipId,
      title,
      order_index: nextOrder,
      duration_minutes: duration,
    });
    setLoading(false);
    if ("error" in r && r.error) {
      toast.error("Erro");
      return;
    }
    toast.success("Módulo adicionado");
    onOpenChange(false);
    setTitle("");
    setDuration(null);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Módulo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dur">Duração (minutos)</Label>
            <Input
              id="dur"
              type="number"
              min={0}
              value={duration ?? ""}
              onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : null)}
              placeholder="Opcional"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>{loading ? "A criar..." : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConsumeDialog({
  module,
  mentorshipId,
  onClose,
}: {
  module: MentorshipModule;
  mentorshipId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [insights, setInsights] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = await markModuleConsumedAction(module.id, mentorshipId, insights);
      if ("error" in r && r.error) {
        toast.error("Erro");
        return;
      }
      toast.success("Módulo concluído");
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir: {module.title}</DialogTitle>
          <DialogDescription>Regista os key insights deste módulo.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={insights}
          onChange={(e) => setInsights(e.target.value)}
          rows={5}
          placeholder="O que aprendeste? O que vais aplicar?"
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "A guardar..." : "Marcar como concluído"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
