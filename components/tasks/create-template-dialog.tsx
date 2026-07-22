"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createTaskTemplateAction } from "@/lib/actions/templates";
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/types";
import { toast } from "sonner";
import type { TaskSpace } from "@/lib/queries/tasks";
import type { TaskTemplateCategory } from "@/lib/queries/templates";

const PRIORITIES: TaskPriority[] = ["sem_prioridade", "baixa", "media", "alta", "urgente"];
const HOURS = [1, 2, 3, 4, 6, 8];
const NONE = "none";

interface Member { id: string; label: string }
interface Status { id: string; label: string; color: string }

interface ChildItem {
  title: string;
  priority: TaskPriority;
  estimate_points: number | null;
  default_assignee_id: string | null;
  day_offset: number;
  default_status_id: string | null;
}

interface RootItem extends ChildItem {
  children: ChildItem[];
}

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  spaces: TaskSpace[];
  categories: TaskTemplateCategory[];
  members: Member[];
  statuses: Status[];
}

function newChild(): ChildItem {
  return {
    title: "",
    priority: "media",
    estimate_points: null,
    default_assignee_id: null,
    day_offset: 0,
    default_status_id: null,
  };
}

function newRoot(): RootItem {
  return { ...newChild(), children: [] };
}

function ptsValue(n: number | null): string {
  return n !== null ? n.toString() : NONE;
}

function parsePts(v: string): number | null {
  return v === NONE ? null : parseInt(v, 10);
}

function uuidOrNull(v: string): string | null {
  return v === NONE ? null : v;
}

// Linha de campos secundários partilhada por tarefa raiz e subtarefa
function ItemSecondaryRow({
  assignee,
  dayOffset,
  statusId,
  members,
  statuses,
  onAssigneeChange,
  onDayOffsetChange,
  onStatusChange,
}: {
  assignee: string | null;
  dayOffset: number;
  statusId: string | null;
  members: Member[];
  statuses: Status[];
  onAssigneeChange: (v: string | null) => void;
  onDayOffsetChange: (v: number) => void;
  onStatusChange: (v: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <Select
        value={assignee ?? NONE}
        onValueChange={(v) => onAssigneeChange(uuidOrNull(v))}
      >
        <SelectTrigger className="h-7 text-xs flex-1">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sem responsável</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1 shrink-0">
        <Input
          type="number"
          min={0}
          value={dayOffset}
          onChange={(e) => onDayOffsetChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="h-7 w-16 text-xs text-center"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">dias</span>
      </div>

      <Select
        value={statusId ?? NONE}
        onValueChange={(v) => onStatusChange(uuidOrNull(v))}
      >
        <SelectTrigger className="h-7 text-xs flex-1">
          <SelectValue placeholder="Status inicial" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Status padrão</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  spaces,
  categories,
  members,
  statuses,
}: CreateTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spaceId, setSpaceId] = useState<string>(NONE);
  const [categoryId, setCategoryId] = useState<string>(NONE);
  const [items, setItems] = useState<RootItem[]>([newRoot()]);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName("");
    setDescription("");
    setSpaceId(NONE);
    setCategoryId(NONE);
    setItems([newRoot()]);
  }

  function updateRoot(i: number, patch: Partial<RootItem>) {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  function updateChild(ri: number, ci: number, patch: Partial<ChildItem>) {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === ri
          ? { ...item, children: item.children.map((c, j) => (j === ci ? { ...c, ...patch } : c)) }
          : item,
      ),
    );
  }

  function removeRoot(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function removeChild(ri: number, ci: number) {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === ri ? { ...item, children: item.children.filter((_, j) => j !== ci) } : item,
      ),
    );
  }

  function addChild(ri: number) {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === ri ? { ...item, children: [...item.children, newChild()] } : item,
      ),
    );
  }

  function handleSubmit() {
    if (!name.trim()) { toast.error("O nome do template é obrigatório"); return; }
    if (items.some((i) => !i.title.trim())) { toast.error("Todas as tarefas precisam de título"); return; }
    if (items.some((i) => i.children.some((c) => !c.title.trim()))) { toast.error("Todas as subtarefas precisam de título"); return; }

    startTransition(async () => {
      const result = await createTaskTemplateAction({
        name: name.trim(),
        description: description.trim() || null,
        space_id: uuidOrNull(spaceId),
        category_id: uuidOrNull(categoryId),
        items: items.map((item, i) => ({
          title: item.title.trim(),
          priority: item.priority,
          estimate_points: item.estimate_points,
          sort_order: i,
          default_assignee_id: item.default_assignee_id,
          day_offset: item.day_offset,
          default_status_id: item.default_status_id,
          children: item.children.map((c, j) => ({
            title: c.title.trim(),
            priority: c.priority,
            estimate_points: c.estimate_points,
            sort_order: j,
            default_assignee_id: c.default_assignee_id,
            day_offset: c.day_offset,
            default_status_id: c.default_status_id,
          })),
        })),
      });

      if (result.error) {
        const msg =
          typeof result.error === "string"
            ? result.error
            : Object.values(result.error).flat().join(", ");
        toast.error(msg);
      } else {
        toast.success("Template criado");
        reset();
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Template de Tarefas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Nome *</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Onboarding de Cliente"
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc">Descrição</Label>
            <Textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreve o propósito deste template..."
              rows={2}
            />
          </div>

          {/* Categoria + Espaço */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Espaço</Label>
              <Select value={spaceId} onValueChange={setSpaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Template global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Template global</SelectItem>
                  {spaces.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tarefas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tarefas do template</Label>
              <span className="text-[10px] text-muted-foreground">
                título · prioridade · horas · responsável · dias · status
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item, ri) => (
                <div key={ri} className="rounded-md border p-3 space-y-1 bg-muted/20">
                  {/* Linha principal */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={item.title}
                      onChange={(e) => updateRoot(ri, { title: e.target.value })}
                      placeholder={`Tarefa ${ri + 1}`}
                      className="flex-1 h-8 text-sm"
                    />
                    <Select
                      value={item.priority}
                      onValueChange={(v) => updateRoot(ri, { priority: v as TaskPriority })}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_LABELS[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                      <Select
                        value={ptsValue(item.estimate_points)}
                        onValueChange={(v) => updateRoot(ri, { estimate_points: parsePts(v) })}
                      >
                        <SelectTrigger className="w-20 h-8 text-xs">
                          <SelectValue placeholder="Pts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>—</SelectItem>
                          {HOURS.map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n}h
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <Info className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-56 text-xs">
                            Estimativa em pontos Fibonacci (1, 2, 3, 5, 8, 13). Representa a
                            complexidade relativa da tarefa, não horas. 1 = muito simples,
                            13 = muito complexo.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRoot(ri)}
                      disabled={items.length === 1}
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {/* Linha secundária */}
                  <ItemSecondaryRow
                    assignee={item.default_assignee_id}
                    dayOffset={item.day_offset}
                    statusId={item.default_status_id}
                    members={members}
                    statuses={statuses}
                    onAssigneeChange={(v) => updateRoot(ri, { default_assignee_id: v })}
                    onDayOffsetChange={(v) => updateRoot(ri, { day_offset: v })}
                    onStatusChange={(v) => updateRoot(ri, { default_status_id: v })}
                  />

                  {/* Subtarefas */}
                  {item.children.map((child, ci) => (
                    <div key={ci} className="pl-5 space-y-1 pt-2 border-t border-dashed mt-2">
                      <div className="flex items-center gap-2">
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                        <Input
                          value={child.title}
                          onChange={(e) => updateChild(ri, ci, { title: e.target.value })}
                          placeholder={`Subtarefa ${ci + 1}`}
                          className="flex-1 h-8 text-xs"
                        />
                        <Select
                          value={child.priority}
                          onValueChange={(v) => updateChild(ri, ci, { priority: v as TaskPriority })}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITIES.map((p) => (
                              <SelectItem key={p} value={p}>
                                {PRIORITY_LABELS[p]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1">
                          <Select
                            value={ptsValue(child.estimate_points)}
                            onValueChange={(v) => updateChild(ri, ci, { estimate_points: parsePts(v) })}
                          >
                            <SelectTrigger className="w-20 h-8 text-xs">
                              <SelectValue placeholder="Pts" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>—</SelectItem>
                              {HOURS.map((n) => (
                                <SelectItem key={n} value={n.toString()}>
                                  {n}h
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-muted-foreground hover:text-foreground">
                                  <Info className="size-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-56 text-xs">
                                Tempo previsto para concluir a tarefa, em horas.
                                1h = muito rápido · 8h = dia completo.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeChild(ri, ci)}
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <div className="pl-5">
                        <ItemSecondaryRow
                          assignee={child.default_assignee_id}
                          dayOffset={child.day_offset}
                          statusId={child.default_status_id}
                          members={members}
                          statuses={statuses}
                          onAssigneeChange={(v) => updateChild(ri, ci, { default_assignee_id: v })}
                          onDayOffsetChange={(v) => updateChild(ri, ci, { day_offset: v })}
                          onStatusChange={(v) => updateChild(ri, ci, { default_status_id: v })}
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addChild(ri)}
                    className="ml-5 h-7 text-xs text-muted-foreground mt-1"
                  >
                    <Plus className="size-3 mr-1" />
                    Subtarefa
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setItems((prev) => [...prev, newRoot()])}
              className="w-full"
            >
              <Plus className="size-4 mr-1" />
              Adicionar Tarefa
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { reset(); onOpenChange(false); }}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "A criar..." : "Criar Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
