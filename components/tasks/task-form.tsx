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
import { AvatarDisplay } from "@/components/avatar-display";

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
  defaultListId?: string;
}

interface MemberOption extends Option {
  email?: string;
}

export function TaskForm({
  open,
  onOpenChange,
  statuses,
  clients,
  members,
  defaultStatusId,
  defaultListId,
}: TaskFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [form, setForm] = useState<TaskInput>({
    title: "",
    priority: "sem_prioridade",
    status_id: defaultStatusId ?? statuses.find((s) => s.label.toLowerCase() === "a fazer")?.id ?? statuses[0]?.id ?? null,
    list_id: defaultListId ?? "00000000-0000-0000-0000-000000000011", // Backlog por defeito
  });

  function update<K extends keyof TaskInput>(key: K, value: TaskInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Manter compatibilidade: assignee_id = primeiro assignee
    const assigneeId = assignees[0] ?? null;

    const result = await createTaskAction({
      ...form,
      assignee_id: assigneeId,
      assignees,
    });
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
    setForm({
      title: "",
      priority: "sem_prioridade",
      status_id: defaultStatusId ?? statuses[0]?.id ?? null,
      list_id: defaultListId ?? "00000000-0000-0000-0000-000000000011",
      estimate_points: null,
    });
    setAssignees([]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>Cria uma tarefa nova com cliente, prioridade e responsáveis.</DialogDescription>
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

            <div className="col-span-2 space-y-1.5">
              <Label>Responsáveis</Label>
              <div className="rounded-md border p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {members.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={assignees.includes(m.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignees((prev) => [...prev, m.id]);
                          } else {
                            setAssignees((prev) => prev.filter((id) => id !== m.id));
                          }
                        }}
                        className="size-4 rounded"
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
                {assignees.length > 0 && (
                  <div className="border-t pt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">Seleccionados ({assignees.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {assignees.map((id) => {
                        const member = members.find((m) => m.id === id);
                        if (!member) return null;
                        return (
                          <div
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
                          >
                            <AvatarDisplay name={member.label} size="xs" />
                            <span>{member.label}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setAssignees((prev) => prev.filter((aid) => aid !== id))
                              }
                              className="text-muted-foreground hover:text-foreground"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estimate">Estimativa (pontos)</Label>
              <Select
                value={form.estimate_points?.toString() ?? ""}
                onValueChange={(v) => update("estimate_points", v ? parseInt(v) : null)}
              >
                <SelectTrigger id="estimate">
                  <SelectValue placeholder="Sem estimativa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem estimativa</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="13">13</SelectItem>
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
