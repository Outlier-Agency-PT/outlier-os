"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createStatusAction,
  updateStatusAction,
  deleteStatusAction,
} from "@/lib/actions/statuses";
import { toast } from "sonner";
import type { Status } from "@/lib/types";

type StatusTable =
  | "client_statuses"
  | "task_statuses"
  | "launch_statuses"
  | "content_statuses";

interface Props {
  title: string;
  description: string;
  table: StatusTable;
  statuses: Status[];
}

export function StagesSection({ title, description, table, statuses }: Props) {
  const [editing, setEditing] = useState<Status | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
          <Plus />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {statuses.map((s) => (
            <StatusRow key={s.id} status={s} onEdit={() => setEditing(s)} table={table} />
          ))}
          {statuses.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem estados configurados.</p>
          )}
        </div>
      </CardContent>

      {(editing || creating) && (
        <StatusDialog
          status={editing}
          table={table}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </Card>
  );
}

function StatusRow({
  status,
  onEdit,
  table,
}: {
  status: Status;
  onEdit: () => void;
  table: StatusTable;
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Desativar estado "${status.label}"?`)) return;
    const result = await deleteStatusAction(table, status.id);
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Estado desativado");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-3">
        <span
          className="size-3 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <div>
          <p className="text-sm font-medium">{status.label}</p>
          <p className="text-xs uppercase text-muted-foreground">{status.key}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function StatusDialog({
  status,
  table,
  onClose,
}: {
  status: Status | null;
  table: StatusTable;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    key: status?.key ?? "",
    label: status?.label ?? "",
    color: status?.color ?? "#10B981",
    sort_order: status?.sort_order ?? 99,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const action = status
      ? updateStatusAction(table, status.id, form)
      : createStatusAction(table, form);
    const result = await action;
    setLoading(false);

    if ("error" in result && result.error) {
      const msg = "_form" in result.error ? result.error._form?.[0] : Object.values(result.error)[0]?.[0];
      toast.error(msg ?? "Erro");
      return;
    }
    toast.success(status ? "Estado atualizado" : "Estado criado");
    router.refresh();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{status ? "Editar estado" : "Novo estado"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="key">Key (interna)</Label>
            <Input
              id="key"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              placeholder="ex: em_progresso"
              required
              disabled={!!status}
            />
            <p className="text-xs text-muted-foreground">
              Apenas minúsculas, números e _. Não muda depois de criado.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="label">Label visível</Label>
            <Input
              id="label"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="ex: Em Progresso"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-9 w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sort">Ordem</Label>
              <Input
                id="sort"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "A guardar..." : status ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
