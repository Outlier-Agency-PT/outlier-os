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
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/types";
import { createTaskAction, type TaskInput } from "@/lib/actions/tasks";
import { toast } from "sonner";

interface Option {
  id: string;
  label: string;
}

interface TaskFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  statuses: Option[];
  clients: Option[];
  members: Option[];
  defaultStatusId?: string;
}

export function TaskForm({
  open,
  onOpenChange,
  statuses,
  clients,
  members,
  defaultStatusId,
}: TaskFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<TaskInput>({
    title: "",
    priority: "sem_prioridade",
    status_id: defaultStatusId ?? statuses.find((s) => s.label.toLowerCase() === "a fazer")?.id ?? statuses[0]?.id ?? null,
  });

  function update<K extends keyof TaskInput>(key: K, value: TaskInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createTaskAction(form);
    setLoading(false);

    if ("error" in result && result.error) {
      const errorMsg =
        "_form" in result.error
          ? result.error._form?.[0]
          : Object.values(result.error)[0]?.[0];
      toast.error(errorMsg ?? "Erro ao criar tarefa");
      return;
    }
    toast.success("Tarefa criada");
    onOpenChange(false);
    router.refresh();
    setForm({ title: "", priority: "sem_prioridade", status_id: defaultStatusId ?? statuses[0]?.id ?? null });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>Cria uma tarefa nova com cliente, prioridade e responsável.</DialogDescription>
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
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => update("priority", v as TaskPriority)}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
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
                <SelectTrigger id="client">
                  <SelectValue placeholder="Sem cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignee">Responsável</Label>
              <Select
                value={form.assignee_id ?? ""}
                onValueChange={(v) => update("assignee_id", v || null)}
              >
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="due">Data Limite</Label>
              <Input
                id="due"
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => update("due_date", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "A criar..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
