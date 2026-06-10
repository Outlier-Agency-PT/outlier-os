"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createActionAction,
  updateActionStatusAction,
} from "@/lib/actions/mentorships";
import {
  IMPLEMENTATION_STATUS_LABELS,
  type ImplementationStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ImplementationAction, MentorshipModule } from "@/lib/types";

interface Props {
  mentorshipId: string;
  actions: ImplementationAction[];
  modules: MentorshipModule[];
}

const STATUS_COLORS: Record<ImplementationStatus, string> = {
  pendente: "bg-slate-500/10 text-slate-600",
  a_implementar: "bg-blue-500/10 text-blue-600",
  em_curso: "bg-amber-500/10 text-amber-600",
  implementado: "bg-green-500/10 text-green-600",
  parqueada: "bg-zinc-500/10 text-zinc-600",
};

export function MentorshipActions({ mentorshipId, actions, modules }: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  const implementadas = actions.filter((a) => a.status === "implementado").length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Ações · {implementadas}/{actions.length} implementadas
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem ações. Cria a primeira a partir dos insights dos módulos.
          </p>
        ) : (
          <ul className="space-y-2">
            {actions.map((a) => (
              <ActionRow key={a.id} action={a} mentorshipId={mentorshipId} />
            ))}
          </ul>
        )}
      </CardContent>

      <CreateActionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mentorshipId={mentorshipId}
        modules={modules}
      />
    </Card>
  );
}

function ActionRow({ action, mentorshipId }: { action: ImplementationAction; mentorshipId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeStatus(status: ImplementationStatus) {
    startTransition(async () => {
      const r = await updateActionStatusAction(action.id, mentorshipId, status);
      if ("error" in r && r.error) {
        toast.error("Erro");
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">{action.action}</p>
          {action.why && (
            <p className="mt-0.5 text-xs text-muted-foreground">Porquê: {action.why}</p>
          )}
        </div>
        <Select
          value={action.status}
          onValueChange={(v) => changeStatus(v as ImplementationStatus)}
          disabled={isPending}
        >
          <SelectTrigger className={cn("h-7 w-36 text-xs", STATUS_COLORS[action.status])}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(IMPLEMENTATION_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <Badge variant="outline" className="text-[10px]">
          Prioridade: {action.priority}
        </Badge>
        {action.done_at && (
          <span className="text-green-600">
            ✓ Implementado
          </span>
        )}
      </div>
    </li>
  );
}

function CreateActionDialog({
  open,
  onOpenChange,
  mentorshipId,
  modules,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mentorshipId: string;
  modules: MentorshipModule[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [why, setWhy] = useState("");
  const [moduleId, setModuleId] = useState<string>("");
  const [priority, setPriority] = useState<"baixa" | "media" | "alta" | "urgente">("media");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await createActionAction({
      mentorship_id: mentorshipId,
      module_id: moduleId || null,
      action,
      why: why || null,
      priority,
    });
    setLoading(false);
    if ("error" in r && r.error) {
      toast.error("Erro");
      return;
    }
    toast.success("Ação criada");
    onOpenChange(false);
    setAction("");
    setWhy("");
    setModuleId("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Ação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="act">Ação concreta *</Label>
            <Input
              id="act"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              required
              autoFocus
              placeholder="O que vais fazer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="why">Porquê</Label>
            <Textarea
              id="why"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={2}
              placeholder="Que insight te levou aqui? Que impacto esperas?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mod">Módulo</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger id="mod"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prio">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger id="prio"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
