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
import { AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Option {
  id: string;
  label: string;
}

interface ListOption {
  id: string;
  name: string;
  spaceName?: string;
}

interface TaskFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  statuses: Option[];
  clients: Option[];
  members: Option[];
  lists: ListOption[];
  defaultStatusId?: string;
  defaultListId?: string;
}

const DEFAULT_BACKLOG_ID = "00000000-0000-0000-0000-000000000011";

export function TaskForm({
  open,
  onOpenChange,
  statuses,
  clients,
  members,
  lists,
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
    list_id: defaultListId ?? lists[0]?.id ?? DEFAULT_BACKLOG_ID,
    start_date: "",
    is_recurring: false,
    recurrence_frequency: null,
    recurrence_day_of_week: null,
    recurrence_end_date: null,
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
      list_id: defaultListId ?? lists[0]?.id ?? DEFAULT_BACKLOG_ID,
      estimate_points: null,
      start_date: "",
      is_recurring: false,
      recurrence_frequency: null,
      recurrence_day_of_week: null,
      recurrence_end_date: null,
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
          {/* Título */}
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

          {/* Descrição */}
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
            {/* Estado */}
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

            {/* Prioridade */}
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

            {/* Cliente */}
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

            {/* Responsáveis */}
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
                            <AvatarDisplay name={member.label} size={"xs" as any} />
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

            {/* Estimativa */}
            <div className="space-y-1.5">
              <Label>Estimativa</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    id="estimate-hours"
                    type="number"
                    min="0"
                    max="999"
                    step="1"
                    placeholder="0"
                    className="w-20"
                    value={
                      form.estimate_points != null
                        ? Math.floor(form.estimate_points)
                        : ""
                    }
                    onChange={(e) => {
                      const hours = parseInt(e.target.value, 10);
                      const mins = form.estimate_points != null
                        ? Math.round((form.estimate_points % 1) * 60)
                        : 0;
                      const total = (!e.target.value || isNaN(hours) ? 0 : hours) + mins / 60;
                      update("estimate_points", total === 0 ? null : total);
                    }}
                  />
                  <span className="text-sm text-muted-foreground">h</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Select
                    value={String(
                      form.estimate_points != null
                        ? Math.round((form.estimate_points % 1) * 60)
                        : 0
                    )}
                    onValueChange={(v) => {
                      const hours = form.estimate_points != null
                        ? Math.floor(form.estimate_points)
                        : 0;
                      const total = hours + parseInt(v, 10) / 60;
                      update("estimate_points", total === 0 ? null : total);
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 min</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {!form.estimate_points && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" />
                Sem estimativa definida — recomendado preencher.
              </p>
            )}

            {/* Lista */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="list">Lista</Label>
              <Select
                value={form.list_id ?? ""}
                onValueChange={(v) => update("list_id", v || null)}
              >
                <SelectTrigger id="list">
                  <SelectValue placeholder="Selecionar lista..." />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.spaceName ? `${l.spaceName} / ${l.name}` : l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data de Início */}
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Data de Início</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => update("start_date", e.target.value)}
              />
            </div>

            {/* Data Limite */}
            <div className="space-y-1.5">
              <Label htmlFor="due">Data Limite</Label>
              <Input
                id="due"
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => update("due_date", e.target.value)}
              />
            </div>

            {/* Recorrência */}
            <div className="col-span-2 space-y-3 border-t pt-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="is_recurring"
                  checked={form.is_recurring ?? false}
                  onCheckedChange={(v) => {
                    update("is_recurring", v);
                    if (!v) {
                      update("recurrence_frequency", null);
                      update("recurrence_day_of_week", null);
                    }
                  }}
                />
                <Label htmlFor="is_recurring" className="cursor-pointer">
                  Esta tarefa repete-se
                </Label>
              </div>

              {form.is_recurring && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Frequência</Label>
                      <Select
                        value={form.recurrence_frequency ?? ""}
                        onValueChange={(v) => {
                          update("recurrence_frequency", v as "daily" | "weekly");
                          if (v !== "weekly") update("recurrence_day_of_week", null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Todos os dias</SelectItem>
                          <SelectItem value="weekly">Semanalmente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {form.recurrence_frequency === "weekly" && (
                      <div className="space-y-1.5">
                        <Label>Dia da semana</Label>
                        <Select
                          value={form.recurrence_day_of_week != null ? String(form.recurrence_day_of_week) : ""}
                          onValueChange={(v) => update("recurrence_day_of_week", parseInt(v, 10))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Segunda-feira</SelectItem>
                            <SelectItem value="2">Terça-feira</SelectItem>
                            <SelectItem value="3">Quarta-feira</SelectItem>
                            <SelectItem value="4">Quinta-feira</SelectItem>
                            <SelectItem value="5">Sexta-feira</SelectItem>
                            <SelectItem value="6">Sábado</SelectItem>
                            <SelectItem value="0">Domingo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="recurrence_end_date">Repetir até (opcional)</Label>
                    <Input
                      id="recurrence_end_date"
                      type="date"
                      value={form.recurrence_end_date ?? ""}
                      onChange={(e) => update("recurrence_end_date", e.target.value || null)}
                    />
                  </div>
                </div>
              )}
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
