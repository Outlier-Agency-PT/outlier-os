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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDecisionAction, type DecisionInput } from "@/lib/actions/decisions";
import { DECISION_IMPACT_LABELS } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initiatives: { id: string; title: string }[];
  clients: { id: string; name: string }[];
  mentorships: { id: string; name: string }[];
}

export function DecisionForm({ open, onOpenChange, initiatives, clients, mentorships }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<DecisionInput>({
    title: "",
    status: "pendente",
  });

  function update<K extends keyof DecisionInput>(key: K, value: DecisionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await createDecisionAction(form);
    setLoading(false);
    if ("error" in r && r.error) {
      const msg = "_form" in r.error ? r.error._form?.[0] : "Erro";
      toast.error(msg ?? "Erro");
      return;
    }
    toast.success("Decisão registada");
    onOpenChange(false);
    router.refresh();
    setForm({ title: "", status: "pendente" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Decisão</DialogTitle>
          <DialogDescription>
            Regista uma decisão pendente. Define contexto e opções para decidires depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Pergunta / Decisão *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
              autoFocus
              placeholder="Lançar produto X agora ou esperar?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="context">Contexto</Label>
            <Textarea
              id="context"
              value={form.context ?? ""}
              onChange={(e) => update("context", e.target.value)}
              rows={3}
              placeholder="Que problema isto resolve? Que constraints existem?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="options">Opções</Label>
            <Textarea
              id="options"
              value={form.options ?? ""}
              onChange={(e) => update("options", e.target.value)}
              rows={3}
              placeholder="Opção A: ...&#10;Opção B: ...&#10;Opção C: ..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="impact">Impacto</Label>
              <Select
                value={form.impact ?? ""}
                onValueChange={(v) => update("impact", (v || null) as DecisionInput["impact"])}
              >
                <SelectTrigger id="impact"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DECISION_IMPACT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="urg">Urgência</Label>
              <Input
                id="urg"
                value={form.urgency ?? ""}
                onChange={(e) => update("urgency", e.target.value)}
                placeholder="Esta semana, este mês..."
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ini">Iniciativa</Label>
              <Select
                value={form.initiative_id ?? ""}
                onValueChange={(v) => update("initiative_id", v || null)}
              >
                <SelectTrigger id="ini"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {initiatives.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cli">Cliente</Label>
              <Select
                value={form.client_id ?? ""}
                onValueChange={(v) => update("client_id", v || null)}
              >
                <SelectTrigger id="cli"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="men">Mentoria</Label>
              <Select
                value={form.mentorship_id ?? ""}
                onValueChange={(v) => update("mentorship_id", v || null)}
              >
                <SelectTrigger id="men"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {mentorships.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "A criar..." : "Criar Decisão"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
