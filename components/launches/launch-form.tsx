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
import { createLaunchAction, type LaunchInput } from "@/lib/actions/launches";
import { toast } from "sonner";

interface Option {
  id: string;
  label: string;
}
interface TemplateOption extends Option {
  tier?: string | null;
  task_count?: number;
}

interface LaunchFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  statuses: Option[];
  clients: Option[];
  templates: TemplateOption[];
}

export function LaunchForm({ open, onOpenChange, statuses, clients, templates }: LaunchFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<LaunchInput>({
    name: "",
    status_id: statuses.find((s) => s.label.toLowerCase() === "planeamento")?.id ?? statuses[0]?.id ?? null,
  });

  function update<K extends keyof LaunchInput>(key: K, value: LaunchInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createLaunchAction(form);
    setLoading(false);
    if ("error" in result && result.error) {
      const msg = "_form" in result.error ? result.error._form?.[0] : Object.values(result.error)[0]?.[0];
      toast.error(msg ?? "Erro");
      return;
    }
    toast.success(form.template_id ? "Lançamento criado a partir de template" : "Lançamento criado");
    onOpenChange(false);
    router.refresh();
    setForm({ name: "", status_id: statuses[0]?.id ?? null });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
          <DialogDescription>Cria um lançamento. Se escolheres template, as tarefas são criadas automaticamente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="client">Cliente</Label>
              <Select value={form.client_id ?? ""} onValueChange={(v) => update("client_id", v || null)}>
                <SelectTrigger id="client">
                  <SelectValue placeholder="Sem cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <Select value={form.status_id ?? ""} onValueChange={(v) => update("status_id", v || null)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tier">Tier</Label>
              <Input
                id="tier"
                value={form.tier ?? ""}
                onChange={(e) => update("tier", e.target.value)}
                placeholder="master, premium, traffic..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template">Template</Label>
              <Select value={form.template_id ?? ""} onValueChange={(v) => update("template_id", v || null)}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Sem template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <SelectItem value="__none__" disabled>Sem templates configurados</SelectItem>
                  ) : (
                    templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label} {t.task_count ? `(${t.task_count} tarefas)` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start">Data início</Label>
              <Input
                id="start"
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => update("start_date", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end">Data fim</Label>
              <Input
                id="end"
                type="date"
                value={form.end_date ?? ""}
                onChange={(e) => update("end_date", e.target.value)}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "A criar..." : "Criar Lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
