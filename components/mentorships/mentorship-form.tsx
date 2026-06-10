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
import {
  createMentorshipAction,
  type MentorshipInput,
} from "@/lib/actions/mentorships";
import { MENTORSHIP_STATUS_LABELS } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function MentorshipForm({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<MentorshipInput>({
    name: "",
    status: "ativa",
    cover_emoji: "🎓",
  });

  function update<K extends keyof MentorshipInput>(key: K, value: MentorshipInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await createMentorshipAction(form);
    setLoading(false);
    if ("error" in r && r.error) {
      const msg = "_form" in r.error ? r.error._form?.[0] : "Erro";
      toast.error(msg ?? "Erro");
      return;
    }
    toast.success("Mentoria criada");
    onOpenChange(false);
    router.refresh();
    setForm({ name: "", status: "ativa", cover_emoji: "🎓" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Mentoria</DialogTitle>
          <DialogDescription>
            Curso, formação, livro, comunidade — qualquer fonte de aprendizagem.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[80px_1fr] gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="emoji">Emoji</Label>
              <Input
                id="emoji"
                value={form.cover_emoji}
                onChange={(e) => update("cover_emoji", e.target.value)}
                maxLength={4}
                className="text-2xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                autoFocus
                placeholder="Hormozi · Build & Sell · Naval Almanack"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mentor">Mentor / Autor</Label>
              <Input
                id="mentor"
                value={form.mentor ?? ""}
                onChange={(e) => update("mentor", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="platform">Plataforma</Label>
              <Input
                id="platform"
                value={form.platform ?? ""}
                onChange={(e) => update("platform", e.target.value)}
                placeholder="YouTube, Skool, Kajabi..."
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={form.url ?? ""}
                onChange={(e) => update("url", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="started">Data início</Label>
              <Input
                id="started"
                type="date"
                value={form.started_at ?? ""}
                onChange={(e) => update("started_at", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v as MentorshipInput["status"])}
              >
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MENTORSHIP_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="total">Total módulos</Label>
              <Input
                id="total"
                type="number"
                min={0}
                value={form.total_modules ?? ""}
                onChange={(e) => update("total_modules", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="desc">Descrição</Label>
              <Textarea
                id="desc"
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
            <Button type="submit" disabled={loading}>{loading ? "A criar..." : "Criar Mentoria"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
