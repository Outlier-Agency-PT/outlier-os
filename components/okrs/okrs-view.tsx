"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  createObjectiveAction,
  createKeyResultAction,
  updateKeyResultProgressAction,
  deleteObjectiveAction,
  deleteKeyResultAction,
  type ObjectiveInput,
} from "@/lib/actions/okrs";
import { toast } from "sonner";
import type { Objective, KeyResult } from "@/lib/queries/okrs";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
const CURRENT_YEAR = new Date().getFullYear();

interface Props {
  objectives: Objective[];
  selectedQuarter: string;
  selectedYear: number;
}

export function OkrsView({ objectives, selectedQuarter, selectedYear }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  function setQuarter(q: string) {
    const params = new URLSearchParams();
    params.set("q", q);
    params.set("y", String(selectedYear));
    router.push(`/okrs?${params.toString()}`);
  }

  function setYear(y: number) {
    const params = new URLSearchParams();
    params.set("q", selectedQuarter);
    params.set("y", String(y));
    router.push(`/okrs?${params.toString()}`);
  }

  // Agrupa por departamento
  const grouped = new Map<string, Objective[]>();
  for (const o of objectives) {
    const key = o.department || "Sem departamento";
    const arr = grouped.get(key) ?? [];
    arr.push(o);
    grouped.set(key, arr);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b px-8 py-4">
        <div className="flex rounded-md border">
          {QUARTERS.map((q) => (
            <button
              key={q}
              onClick={() => setQuarter(q)}
              className={`px-3 py-1.5 text-xs transition-colors first:rounded-l-md last:rounded-r-md ${
                selectedQuarter === q ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
        <Select value={String(selectedYear)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateOpen(true)} className="ml-auto">
          <Plus />
          Novo Objetivo
        </Button>
      </div>

      <div className="space-y-6 p-8">
        {objectives.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              Sem objetivos para {selectedQuarter} {selectedYear}. Cria o primeiro.
            </CardContent>
          </Card>
        ) : (
          Array.from(grouped.entries()).map(([dept, objs]) => (
            <div key={dept}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {dept} <span className="text-foreground/40">· {objs.length}</span>
              </p>
              <div className="space-y-3">
                {objs.map((o) => <ObjectiveCard key={o.id} objective={o} />)}
              </div>
            </div>
          ))
        )}
      </div>

      <CreateObjectiveDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultQuarter={selectedQuarter}
        defaultYear={selectedYear}
      />
    </>
  );
}

function ObjectiveCard({ objective }: { objective: Objective }) {
  const router = useRouter();
  const [krOpen, setKrOpen] = useState(false);

  async function handleDelete() {
    if (!confirm(`Eliminar objetivo "${objective.title}"?`)) return;
    const result = await deleteObjectiveAction(objective.id);
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Objetivo eliminado");
    router.refresh();
  }

  const confidenceColor = {
    alta: "text-green-600",
    media: "text-yellow-600",
    baixa: "text-red-600",
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{objective.title}</CardTitle>
            {objective.confidence && (
              <Badge variant="outline" className={`text-[10px] ${confidenceColor[objective.confidence]}`}>
                Confiança: {objective.confidence}
              </Badge>
            )}
          </div>
          {objective.description && (
            <p className="mt-1 text-xs text-muted-foreground">{objective.description}</p>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={handleDelete}>
          <Trash2 className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className="font-medium">{objective.progress.toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${objective.progress}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          {objective.key_results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem Key Results.</p>
          ) : (
            objective.key_results.map((kr) => <KeyResultRow key={kr.id} kr={kr} />)
          )}
          <Button size="sm" variant="ghost" onClick={() => setKrOpen(true)}>
            <Plus className="size-3" />
            Adicionar Key Result
          </Button>
        </div>

        <CreateKeyResultDialog
          open={krOpen}
          onOpenChange={setKrOpen}
          objectiveId={objective.id}
        />
      </CardContent>
    </Card>
  );
}

function KeyResultRow({ kr }: { kr: KeyResult }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(kr.current_value);
  const range = kr.target_value - kr.initial_value;
  const progress = range === 0 ? 0 : Math.max(0, Math.min(100, ((kr.current_value - kr.initial_value) / range) * 100));

  async function save() {
    const result = await updateKeyResultProgressAction(kr.id, value);
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Eliminar Key Result "${kr.title}"?`)) return;
    await deleteKeyResultAction(kr.id);
    router.refresh();
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{kr.title}</p>
        <Button size="icon" variant="ghost" className="-mt-1" onClick={handleDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <span className="text-muted-foreground">Início: {kr.initial_value}</span>
        {editing ? (
          <>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="h-7 w-24"
            />
            <Button size="sm" onClick={save}>Guardar</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="font-medium hover:underline"
            >
              Atual: {kr.current_value}
            </button>
            <span className="text-muted-foreground">Meta: {kr.target_value}</span>
            <span className="ml-auto font-medium">{progress.toFixed(0)}%</span>
          </>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full transition-all"
          style={{
            width: `${progress}%`,
            backgroundColor: progress >= 70 ? "#10B981" : progress >= 30 ? "#F59E0B" : "#EF4444",
          }}
        />
      </div>
    </div>
  );
}

function CreateObjectiveDialog({
  open,
  onOpenChange,
  defaultQuarter,
  defaultYear,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultQuarter: string;
  defaultYear: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ObjectiveInput>({
    title: "",
    quarter: defaultQuarter as "Q1" | "Q2" | "Q3" | "Q4",
    year: defaultYear,
    status: "em_progresso",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createObjectiveAction(form);
    setLoading(false);
    if ("error" in result && result.error) {
      const msg = "_form" in result.error ? result.error._form?.[0] : Object.values(result.error)[0]?.[0];
      toast.error(msg ?? "Erro");
      return;
    }
    toast.success("Objetivo criado");
    onOpenChange(false);
    router.refresh();
    setForm({ title: "", quarter: defaultQuarter as "Q1" | "Q2" | "Q3" | "Q4", year: defaultYear, status: "em_progresso" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Objetivo</DialogTitle>
          <DialogDescription>OKR para {defaultQuarter} {defaultYear}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Objetivo *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              autoFocus
              placeholder="Ex: Crescer receita 40%"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea
              id="desc"
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dept">Departamento</Label>
              <Input
                id="dept"
                value={form.department ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="Vendas, Operações..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conf">Confiança</Label>
              <Select
                value={form.confidence ?? ""}
                onValueChange={(v) => setForm((f) => ({ ...f, confidence: (v || null) as ObjectiveInput["confidence"] }))}
              >
                <SelectTrigger id="conf">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

function CreateKeyResultDialog({
  open,
  onOpenChange,
  objectiveId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  objectiveId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    initial_value: 0,
    current_value: 0,
    target_value: 100,
    deadline: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createKeyResultAction({
      objective_id: objectiveId,
      title: form.title,
      initial_value: form.initial_value,
      current_value: form.current_value,
      target_value: form.target_value,
      deadline: form.deadline || null,
      sort_order: 0,
    });
    setLoading(false);
    if ("error" in result && result.error) {
      toast.error("Erro a criar Key Result");
      return;
    }
    toast.success("Key Result criado");
    onOpenChange(false);
    router.refresh();
    setForm({ title: "", initial_value: 0, current_value: 0, target_value: 100, deadline: "" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Key Result</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="kr-title">Título *</Label>
            <Input
              id="kr-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              autoFocus
              placeholder="Ex: 10 vendas"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="initial">Início</Label>
              <Input
                id="initial"
                type="number"
                value={form.initial_value}
                onChange={(e) => setForm((f) => ({ ...f, initial_value: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="current">Atual</Label>
              <Input
                id="current"
                type="number"
                value={form.current_value}
                onChange={(e) => setForm((f) => ({ ...f, current_value: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target">Meta *</Label>
              <Input
                id="target"
                type="number"
                value={form.target_value}
                onChange={(e) => setForm((f) => ({ ...f, target_value: Number(e.target.value) }))}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
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
