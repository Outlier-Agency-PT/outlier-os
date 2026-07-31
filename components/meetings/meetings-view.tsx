"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List as ListIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMeetingAction, type MeetingInput } from "@/lib/actions/meetings";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Meeting } from "@/lib/queries/meetings";

interface Props {
  meetings: Meeting[];
  clients: { id: string; name: string }[];
  students: { id: string; name: string }[];
}

export function MeetingsView({ meetings, clients, students }: Props) {
  const [view, setView] = useState<"agenda" | "lista">("agenda");
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [open, setOpen] = useState(false);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings) {
      const key = m.scheduled_at.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return map;
  }, [meetings]);

  function shiftWeek(delta: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  }

  function today() {
    const d = new Date();
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    d.setHours(0, 0, 0, 0);
    setWeekStart(d);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b px-8 py-4">
        <div className="flex rounded-md border">
          {[
            { key: "agenda", icon: CalendarIcon, label: "Agenda" },
            { key: "lista", icon: ListIcon, label: "Lista" },
          ].map((v) => {
            const Icon = v.icon;
            const active = view === v.key;
            return (
              <button
                key={v.key}
                onClick={() => setView(v.key as "agenda" | "lista")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors first:rounded-l-md last:rounded-r-md",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <Icon className="size-3.5" />
                {v.label}
              </button>
            );
          })}
        </div>

        {view === "agenda" && (
          <>
            <Button size="icon" variant="outline" onClick={() => shiftWeek(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => shiftWeek(1)}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={today}>Hoje</Button>
            <p className="text-sm text-muted-foreground">
              {formatDate(weekStart)} → {formatDate(weekEnd)}
            </p>
          </>
        )}

        <Button onClick={() => setOpen(true)} className="ml-auto">
          <Plus />
          Nova Reunião
        </Button>
      </div>

      <div className="p-8">
        {view === "agenda" ? (
          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const key = d.toISOString().slice(0, 10);
              const dayMeetings = meetingsByDay.get(key) ?? [];
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <Card key={key} className={cn(isToday && "border-primary")}>
                  <CardContent className="p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"][(d.getDay() + 6) % 7]}
                    </p>
                    <p className="text-lg font-bold">{d.getDate()}</p>
                    <div className="mt-2 space-y-1">
                      {dayMeetings.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">—</p>
                      ) : (
                        dayMeetings.map((m) => (
                          <div key={m.id} className="rounded-md border bg-muted/30 p-2">
                            <p className="text-[10px] font-medium leading-tight">
                              {new Date(m.scheduled_at).toLocaleTimeString("pt-PT", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="line-clamp-2 text-xs">{m.title}</p>
                            {m.client && (
                              <p className="truncate text-[10px] text-muted-foreground">{m.client.name}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              {meetings.length === 0 ? (
                <p className="p-12 text-center text-sm text-muted-foreground">
                  Sem reuniões.
                </p>
              ) : (
                <ul className="divide-y">
                  {meetings.map((m) => (
                    <li key={m.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.scheduled_at).toLocaleString("pt-PT")}
                          {m.client && <> · {m.client.name}</>}
                          {m.location && <> · {m.location}</>}
                        </p>
                      </div>
                      {m.duration_minutes && (
                        <span className="text-xs text-muted-foreground">
                          {m.duration_minutes}min
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <CreateMeetingDialog
        open={open}
        onOpenChange={setOpen}
        clients={clients}
        students={students}
      />
    </>
  );
}

function CreateMeetingDialog({
  open,
  onOpenChange,
  clients,
  students,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: { id: string; name: string }[];
  students: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<MeetingInput>({
    title: "",
    scheduled_at: new Date().toISOString().slice(0, 16),
    duration_minutes: 60,
    student_ids: [],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createMeetingAction(form);
    setLoading(false);
    if ("error" in result && result.error) {
      const msg = "_form" in result.error ? result.error._form?.[0] : Object.values(result.error)[0]?.[0];
      toast.error(msg ?? "Erro");
      return;
    }
    toast.success("Reunião criada");
    onOpenChange(false);
    router.refresh();
    setForm({
      title: "",
      scheduled_at: new Date().toISOString().slice(0, 16),
      duration_minutes: 60,
      student_ids: [],
    });
  }

  function toggleStudent(id: string) {
    setForm((f) => {
      const ids = f.student_ids ?? [];
      return {
        ...f,
        student_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      };
    });
  }

  const selectedCount = form.student_ids?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Reunião</DialogTitle>
          <DialogDescription>Calendariza com cliente, agenda e duração.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="when">Data e hora *</Label>
              <Input
                id="when"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dur">Duração (min)</Label>
              <Input
                id="dur"
                type="number"
                value={form.duration_minutes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl">Cliente</Label>
              <Select
                value={form.client_id ?? ""}
                onValueChange={(v) => setForm((f) => ({ ...f, client_id: v || null }))}
              >
                <SelectTrigger id="cl">
                  <SelectValue placeholder="Sem cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc">Local</Label>
              <Input
                id="loc"
                value={form.location ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Online, escritório, URL..."
              />
            </div>
          </div>

          {/* Alunos */}
          {students.length > 0 && (
            <div className="space-y-1.5">
              <Label>
                Alunos{" "}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <div className="max-h-36 overflow-y-auto rounded-md border p-2 space-y-1">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={form.student_ids?.includes(s.id) ?? false}
                      onChange={() => toggleStudent(s.id)}
                      className="size-3.5 rounded"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
              {selectedCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedCount} aluno{selectedCount !== 1 ? "s" : ""} seleccionado{selectedCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="agenda">Agenda</Label>
            <Textarea
              id="agenda"
              value={form.agenda_md ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, agenda_md: e.target.value }))}
              rows={4}
              placeholder="Pontos a discutir..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "A criar..." : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
