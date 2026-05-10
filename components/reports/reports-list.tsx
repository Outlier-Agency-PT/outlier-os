"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateReportAction } from "@/lib/actions/reports";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Report } from "@/lib/queries/reports";

interface Props {
  reports: Report[];
  clients: { id: string; name: string }[];
}

export function ReportsList({ reports, clients }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end border-b px-8 py-4">
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Gerar Relatório
        </Button>
      </div>

      <div className="p-8">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              Sem relatórios. Gera o primeiro.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <Link key={r.id} href={`/relatorios/${r.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {r.client?.name ?? "—"}
                        </p>
                        <p className="mt-1 font-semibold">
                          Relatório {r.type === "semanal" ? "Semanal" : "Mensal"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(r.period_start)} → {formatDate(r.period_end)}
                        </p>
                      </div>
                      <Badge variant={r.status === "publicado" ? "default" : "secondary"}>
                        {r.status === "publicado" ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xl font-bold">{r.kpis?.tarefas_concluidas ?? 0}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Tarefas</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold">{r.kpis?.conteudos_publicados ?? 0}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Conteúdos</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold">{r.kpis?.lancamentos_ativos ?? 0}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Lançamentos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <GenerateDialog open={open} onOpenChange={setOpen} clients={clients} />
    </>
  );
}

function GenerateDialog({
  open,
  onOpenChange,
  clients,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"semanal" | "mensal">("semanal");
  const [clientId, setClientId] = useState<string>("");
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));

  function setThisWeek() {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7; // segunda = 0
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setStart(monday.toISOString().slice(0, 10));
    setEnd(sunday.toISOString().slice(0, 10));
  }

  function setThisMonth() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setStart(first.toISOString().slice(0, 10));
    setEnd(last.toISOString().slice(0, 10));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      toast.error("Escolhe um cliente");
      return;
    }
    setLoading(true);
    const result = await generateReportAction({
      client_id: clientId,
      type,
      period_start: start,
      period_end: end,
    });
    setLoading(false);
    if ("error" in result && result.error) {
      const msg = "_form" in result.error ? result.error._form?.[0] : "Erro";
      toast.error(msg ?? "Erro");
      return;
    }
    toast.success("Relatório gerado");
    onOpenChange(false);
    router.refresh();
    if ("data" in result && result.data) {
      router.push(`/relatorios/${(result.data as { id: string }).id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar Relatório</DialogTitle>
          <DialogDescription>Agrega tarefas, conteúdos e lançamentos do período.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="client">Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="client">
                <SelectValue placeholder="Selecionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as "semanal" | "mensal")}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={setThisWeek}>Esta semana</Button>
            <Button type="button" variant="outline" size="sm" onClick={setThisMonth}>Este mês</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start">Início</Label>
              <Input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">Fim</Label>
              <Input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "A gerar..." : "Gerar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
