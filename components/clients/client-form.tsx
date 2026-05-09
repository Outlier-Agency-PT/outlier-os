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
import { CLIENT_TYPE_LABELS, type ClientType } from "@/lib/types";
import { createClientAction, type ClientInput } from "@/lib/actions/clients";
import { toast } from "sonner";

interface Status {
  id: string;
  label: string;
}
interface Member {
  id: string;
  full_name: string;
}

interface ClientFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  statuses: Status[];
  members: Member[];
}

export function ClientForm({ open, onOpenChange, statuses, members }: ClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ClientInput>({
    name: "",
    client_type: "long_term",
    status_id: statuses[0]?.id ?? null,
  });

  function update<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createClientAction(form);
    setLoading(false);

    if ("error" in result && result.error) {
      const errorMsg =
        "_form" in result.error
          ? result.error._form?.[0]
          : Object.values(result.error)[0]?.[0];
      toast.error(errorMsg ?? "Erro ao criar cliente");
      return;
    }
    toast.success("Cliente criado");
    onOpenChange(false);
    router.refresh();
    setForm({ name: "", client_type: "long_term", status_id: statuses[0]?.id ?? null });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>Preenche os campos para criar um novo cliente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={form.client_type}
                onValueChange={(v) => update("client_type", v as ClientType)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={form.status_id ?? ""}
                onValueChange={(v) => update("status_id", v || null)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="responsible">Responsável</Label>
              <Select
                value={form.responsible_id ?? ""}
                onValueChange={(v) => update("responsible_id", v || null)}
              >
                <SelectTrigger id="responsible">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sector">Sector</Label>
              <Input
                id="sector"
                value={form.sector ?? ""}
                onChange={(e) => update("sector", e.target.value)}
                placeholder="E-commerce, SaaS, etc."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact">Contacto</Label>
              <Input
                id="contact"
                value={form.contact_name ?? ""}
                onChange={(e) => update("contact_name", e.target.value)}
                placeholder="Nome do contacto"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone ?? ""}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website ?? ""}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="value">Valor mensal (€)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={form.monthly_value ?? ""}
                onChange={(e) => update("monthly_value", e.target.value ? Number(e.target.value) : null)}
              />
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
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ""}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "A criar..." : "Criar Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
