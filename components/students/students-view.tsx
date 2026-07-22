"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { createStudentAction, type StudentInput } from "@/lib/actions/students";
import { completeReminderAction } from "@/lib/actions/reminders";
import { ActivityBadge } from "@/components/incubadora/incubadora-components";
import { toast } from "sonner";
import type { Student, PendingReminder } from "@/lib/queries/students";
import type { StudentProgressSummary, DetailedStudentProgress } from "@/lib/queries/incubadora";

const LEVEL_LABELS = {
  aprendiz: "Aprendiz",
  fazedor: "Fazedor",
  referencia: "Referência",
  suspenso: "Suspenso",
} as const;

const LEVEL_COLORS = {
  aprendiz: "#94A3B8",
  fazedor: "#3B82F6",
  referencia: "#F59E0B",
  suspenso: "#6B7280",
};

interface Props {
  students: Student[];
  members: { id: string; full_name: string }[];
  progressMap?: Map<string, StudentProgressSummary>;
  detailedProgressMap?: Map<string, DetailedStudentProgress>;
  pendingReminders?: PendingReminder[];
}

export function StudentsView({ students, members, progressMap, detailedProgressMap, pendingReminders }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.nicho?.toLowerCase().includes(q),
    );
  }, [students, search]);

  // Agrupa por nível
  type LevelKey = keyof typeof LEVEL_LABELS;
  const byLevel: Record<LevelKey, Student[]> = {
    aprendiz: [],
    fazedor: [],
    referencia: [],
    suspenso: [],
  };
  for (const s of filtered) {
    const key = s.level as LevelKey;
    if (key in byLevel) byLevel[key].push(s);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b px-8 py-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar alunos..."
          className="max-w-xs"
        />
        <Button onClick={() => setOpen(true)} className="ml-auto">
          <Plus />
          Novo Aluno
        </Button>
      </div>

      <div className="space-y-6 p-8">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi label="Total Alunos" value={students.length} />
          <Kpi label="Ativos" value={students.filter((s) => s.status === "ativo").length} />
          <Kpi label="Aprendizes" value={byLevel["aprendiz"]?.length ?? 0} />
        </div>

        {/* Kanban por nível */}
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(LEVEL_LABELS) as (keyof typeof LEVEL_LABELS)[]).map((level) => (
            <div key={level} className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: LEVEL_COLORS[level] }} />
                  <p className="text-xs font-semibold">{LEVEL_LABELS[level]}</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {byLevel[level]?.length ?? 0}
                </Badge>
              </div>
              <div className="space-y-2">
                {byLevel[level]?.length === 0 ? (
                  <p className="text-xs text-muted-foreground">—</p>
                ) : (
                  byLevel[level]!.map((s) => {
                    const detailed = detailedProgressMap?.get(s.id);
                    const progressPercent = detailed?.progress_pct ?? 0;
                    const progressColor =
                      progressPercent <= 33
                        ? "#9CA3AF"
                        : progressPercent <= 66
                          ? "#3B82F6"
                          : "#10B981";

                    return (
                      <Link key={s.id} href={`/incubadora/${s.id}`}>
                        <Card className="transition-shadow hover:shadow-md">
                          <CardContent className="p-3 space-y-1.5">
                            <p className="text-sm font-medium">{s.name}</p>
                            {s.coach && (
                              <p className="text-[10px] text-muted-foreground">Coach: {s.coach.full_name}</p>
                            )}
                            {s.nicho && (
                              <p className="text-[10px] text-muted-foreground">{s.nicho}</p>
                            )}

                            {detailed && (
                              <>
                                <div className="h-1 w-full overflow-hidden rounded-full bg-muted mt-2">
                                  <div
                                    className="h-full transition-all"
                                    style={{
                                      width: `${Math.min(progressPercent, 100)}%`,
                                      backgroundColor: progressColor,
                                    }}
                                  />
                                </div>

                                <div className="space-y-0.5">
                                  <p className="text-[10px] text-muted-foreground">
                                    {detailed.modules_completed}/5 módulos · {detailed.challenges_completed}/4 desafios
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {detailed.track_steps_completed}/7 passos
                                  </p>

                                  {detailed.last_activity_at === null ? (
                                    <p className="text-[10px] text-muted-foreground">Sem início</p>
                                  ) : detailed.days_since_activity !== null && detailed.days_since_activity >= 14 ? (
                                    <p className="text-[10px] font-medium text-red-600">
                                      {detailed.days_since_activity}d sem atividade
                                    </p>
                                  ) : null}
                                </div>
                              </>
                            )}

                            {progressMap && (
                              <ActivityBadge summary={progressMap.get(s.id)} />
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Lembretes pendentes */}
        {pendingReminders && pendingReminders.length > 0 && (
          <div className="space-y-3 border-t pt-6">
            <h2 className="text-lg font-semibold">Lembretes</h2>
            {["vencido", "hoje", "esta-semana"].map((urgency) => {
              const group = pendingReminders.filter((r) => r.urgency === urgency);
              if (group.length === 0) return null;

              const urgencyLabel = urgency === "vencido" ? "🔴 Vencidos" : urgency === "hoje" ? "🟡 Hoje" : "🟠 Esta semana";
              return (
                <div key={urgency} className="space-y-2">
                  <h3 className="text-sm font-medium">{urgencyLabel}</h3>
                  <div className="space-y-2">
                    {group.map((reminder) => {
                      const reminderDate = new Date(reminder.reminder_date);
                      const formattedDate = reminderDate.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
                      const contentPreview = reminder.content.length > 80 ? reminder.content.slice(0, 80) + "..." : reminder.content;

                      return (
                        <div key={reminder.id} className="rounded-lg border bg-card p-3 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-1.5">
                              <Link href={`/incubadora/${reminder.student_id}`} className="hover:underline">
                                <p className="text-sm font-medium text-foreground">{reminder.student_name}</p>
                              </Link>

                              <p className="text-xs text-muted-foreground">
                                Lembrete para {formattedDate}{reminder.reminder_note && ` · ${reminder.reminder_note}`}
                              </p>

                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-xs">{reminder.contact_type}</Badge>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground">{contentPreview}</span>
                              </div>
                            </div>

                            <button
                              onClick={async () => {
                                const result = await completeReminderAction(reminder.id, reminder.student_id);
                                if ("error" in result && result.error) {
                                  toast.error(result.error);
                                } else {
                                  toast.success("Lembrete concluído");
                                  window.location.reload();
                                }
                              }}
                              className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded border border-input hover:bg-muted transition-colors"
                              title="Marcar como concluído"
                            >
                              <span className="text-lg font-medium">✓</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateStudentDialog open={open} onOpenChange={setOpen} members={members} />
    </>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function CreateStudentDialog({
  open,
  onOpenChange,
  members,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [form, setForm] = useState<StudentInput>({
    name: "",
    level: "aprendiz",
  });

  function update<K extends keyof StudentInput>(key: K, value: StudentInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createStudentAction(form);
    setLoading(false);
    if ("error" in result && result.error) {
      const msg = "_form" in result.error ? result.error._form?.[0] : Object.values(result.error)[0]?.[0];
      toast.error(msg ?? "Erro");
      return;
    }

    // Se tem password, mostrar credenciais
    if ("data" in result && result.data && result.data.password && form.email) {
      setCredentials({
        email: form.email,
        password: result.data.password,
      });
      setForm({ name: "", level: "aprendiz" });
      return;
    }

    toast.success("Aluno criado com 6 sessões pré-criadas");
    onOpenChange(false);
    router.refresh();
    setForm({ name: "", level: "aprendiz" });
  }

  // Dialog de credenciais
  if (credentials) {
    return (
      <Dialog open={!!credentials} onOpenChange={() => setCredentials(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aluno Criado! 🎉</DialogTitle>
            <DialogDescription>
              Partilha estas credenciais de acesso com o aluno
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 rounded-lg bg-blue-50 p-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-blue-900">Email</p>
              <p className="font-mono text-sm text-blue-700">{credentials.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-blue-900">Palavra-passe</p>
              <p className="font-mono text-sm text-blue-700">{credentials.password}</p>
            </div>
          </div>

          <Button
            onClick={() => {
              navigator.clipboard.writeText(`Email: ${credentials.email}\nPalavra-passe: ${credentials.password}`);
              toast.success("Credenciais copiadas!");
            }}
            className="w-full"
          >
            Copiar Credenciais
          </Button>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCredentials(null);
                onOpenChange(false);
                router.refresh();
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Aluno</DialogTitle>
          <DialogDescription>
            Cria-se aluno + 6 sessões placeholder (Sessão Inicial, Hotseat #1-3, Estratégica 1-2).
          </DialogDescription>
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
              <Label htmlFor="ig">Instagram</Label>
              <Input
                id="ig"
                value={form.instagram ?? ""}
                onChange={(e) => update("instagram", e.target.value)}
                placeholder="@username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nicho">Nicho</Label>
              <Input
                id="nicho"
                value={form.nicho ?? ""}
                onChange={(e) => update("nicho", e.target.value)}
                placeholder="Fitness, Educação..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subnicho">Subnicho</Label>
              <Input
                id="subnicho"
                value={form.subnicho ?? ""}
                onChange={(e) => update("subnicho", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coach">Coach</Label>
              <Select
                value={form.coach_id ?? ""}
                onValueChange={(v) => update("coach_id", v || null)}
              >
                <SelectTrigger id="coach">
                  <SelectValue placeholder="Sem coach" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="level">Nível</Label>
              <Select
                value={form.level}
                onValueChange={(v) => update("level", v as StudentInput["level"])}
              >
                <SelectTrigger id="level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprendiz">Aprendiz</SelectItem>
                  <SelectItem value="fazedor">Fazedor</SelectItem>
                  <SelectItem value="referencia">Referência</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="turma">Turma</Label>
              <Input
                id="turma"
                value={form.turma ?? ""}
                onChange={(e) => update("turma", e.target.value)}
                placeholder="T1 2026, etc"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry">Tipo de entrada</Label>
              <Input
                id="entry"
                value={form.entry_type ?? ""}
                onChange={(e) => update("entry_type", e.target.value)}
                placeholder="Orgânico, Pago, Indicação..."
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
              <Label htmlFor="briefing">Briefing</Label>
              <Textarea
                id="briefing"
                value={form.briefing ?? ""}
                onChange={(e) => update("briefing", e.target.value)}
                rows={3}
                placeholder="Objetivos, público-alvo, contexto..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "A criar..." : "Criar Aluno"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
