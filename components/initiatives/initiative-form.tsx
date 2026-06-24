"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createInitiativeAction,
  updateInitiativeAction,
  type InitiativeInput,
} from "@/lib/actions/initiatives";
import {
  INITIATIVE_STATUS_LABELS,
  INITIATIVE_PRIORITY_LABELS,
  INITIATIVE_SOURCE_LABELS,
} from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: { id: string; full_name: string }[];
  clients: { id: string; name: string }[];
  mentorships: { id: string; name: string }[];
  existing?: { id: string } & Partial<InitiativeInput>;
}

const EMPTY: InitiativeInput = {
  title: "",
  status: "ideia",
  priority: "media",
  source: "interno",
  focus_this_week: false,
  needs_decision: false,
  tags: [],
};

export function InitiativeForm({ open, onOpenChange, members, clients, mentorships, existing }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = !!existing;
  const [form, setForm] = useState<InitiativeInput>(
    existing ? { ...EMPTY, ...existing, tags: existing.tags ?? [] } : EMPTY,
  );

  function update<K extends keyof InitiativeInput>(key: K, value: InitiativeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = isEdit
      ? await updateInitiativeAction(existing!.id, form)
      : await createInitiativeAction(form);
    setLoading(false);
    if ("error" in result && result.error) {
      const msg =
        typeof result.error === "string"
          ? result.error
          : "_form" in result.error
            ? result.error._form?.[0]
            : "Erro";
      toast.error(msg ?? "Erro");
      return;
    }
    toast.success(isEdit ? "Iniciativa atualizada" : "Iniciativa criada");
    onOpenChange(false);
    router.refresh();
    if (!isEdit) setForm(EMPTY);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Iniciativa" : "Nova Iniciativa"}</DialogTitle>
          <DialogDescription>
            Projeto estratégico com horizonte de meses. Define owner e métrica.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
              autoFocus
              placeholder="Ex: Lançar produto X · Migrar clientes para nova plataforma"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea
              id="desc"
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v as InitiativeInput["status"])}
              >
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INITIATIVE_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => update("priority", v as InitiativeInput["priority"])}
              >
                <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INITIATIVE_PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source">Origem</Label>
              <Select
                value={form.source}
                onValueChange={(v) => update("source", v as InitiativeInput["source"])}
              >
                <SelectTrigger id="source"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INITIATIVE_SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="owner">Owner</Label>
              <Select
                value={form.owner_id ?? ""}
                onValueChange={(v) => update("owner_id", v || null)}
              >
                <SelectTrigger id="owner"><SelectValue placeholder="Sem owner" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client">Cliente</Label>
              <Select
                value={form.client_id ?? ""}
                onValueChange={(v) => update("client_id", v || null)}
              >
                <SelectTrigger id="client"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mentor">Mentoria</Label>
              <Select
                value={form.mentorship_id ?? ""}
                onValueChange={(v) => update("mentorship_id", v || null)}
              >
                <SelectTrigger id="mentor"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {mentorships.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="impact">Impacto esperado</Label>
              <Input
                id="impact"
                value={form.expected_impact ?? ""}
                onChange={(e) => update("expected_impact", e.target.value)}
                placeholder="+20% MRR, etc"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="effort">Esforço esperado</Label>
              <Input
                id="effort"
                value={form.expected_effort ?? ""}
                onChange={(e) => update("expected_effort", e.target.value)}
                placeholder="2 semanas, 1 sprint, etc"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="next">Próximo passo</Label>
            <Input
              id="next"
              value={form.next_step ?? ""}
              onChange={(e) => update("next_step", e.target.value)}
              placeholder="A única coisa que move isto para a frente"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.focus_this_week ?? false}
                onCheckedChange={(v) => update("focus_this_week", v)}
              />
              <span>Foco esta semana</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.needs_decision ?? false}
                onCheckedChange={(v) => update("needs_decision", v)}
              />
              <span>Precisa de decisão tua</span>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "A criar..." : "Criar Iniciativa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
