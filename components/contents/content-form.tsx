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
import { createContentAction, type ContentInput } from "@/lib/actions/contents";
import { toast } from "sonner";

interface Option {
  id: string;
  label: string;
}

interface ContentFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  statuses: Option[];
  clients: Option[];
  members: Option[];
  defaultStatusId?: string;
}

const PLATFORMS = ["Instagram", "YouTube", "TikTok", "LinkedIn", "Facebook", "Twitter/X"];
const FORMATS = ["Reel", "Carrossel", "Post", "Story", "Vídeo Longo", "Short", "Newsletter", "Thread"];

export function ContentForm({
  open,
  onOpenChange,
  statuses,
  clients,
  members,
  defaultStatusId,
}: ContentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ContentInput>({
    name: "",
    status_id: defaultStatusId ?? statuses.find((s) => s.label.toLowerCase() === "ideia")?.id ?? statuses[0]?.id ?? null,
    platforms: [],
  });

  function update<K extends keyof ContentInput>(key: K, value: ContentInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function togglePlatform(p: string) {
    const current = form.platforms ?? [];
    update("platforms", current.includes(p) ? current.filter((x) => x !== p) : [...current, p]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createContentAction(form);
    setLoading(false);
    if ("error" in result && result.error) {
      const msg = "_form" in result.error ? result.error._form?.[0] : Object.values(result.error)[0]?.[0];
      toast.error(msg ?? "Erro");
      return;
    }
    toast.success("Conteúdo criado");
    onOpenChange(false);
    router.refresh();
    setForm({ name: "", status_id: defaultStatusId ?? statuses[0]?.id ?? null, platforms: [] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Conteúdo</DialogTitle>
          <DialogDescription>Cria conteúdo no workflow editorial.</DialogDescription>
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
              <Label htmlFor="format">Formato</Label>
              <Select value={form.format ?? ""} onValueChange={(v) => update("format", v || null)}>
                <SelectTrigger id="format">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="responsible">Responsável</Label>
              <Select value={form.responsible_id ?? ""} onValueChange={(v) => update("responsible_id", v || null)}>
                <SelectTrigger id="responsible">
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Plataformas</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const active = (form.platforms ?? []).includes(p);
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="publish">Data publicação</Label>
              <Input
                id="publish"
                type="date"
                value={form.publish_date?.slice(0, 10) ?? ""}
                onChange={(e) => update("publish_date", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="objective">Objetivo</Label>
              <Input
                id="objective"
                value={form.objective ?? ""}
                onChange={(e) => update("objective", e.target.value)}
                placeholder="Awareness, conversão..."
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="copy">Copy do post</Label>
              <Textarea
                id="copy"
                value={form.copy_post ?? ""}
                onChange={(e) => update("copy_post", e.target.value)}
                rows={3}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="copy_design">Texto para design</Label>
              <Textarea
                id="copy_design"
                value={form.copy_design ?? ""}
                onChange={(e) => update("copy_design", e.target.value)}
                rows={2}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ""}
                onChange={(e) => update("notes", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "A criar..." : "Criar Conteúdo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
