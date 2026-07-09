"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyTaskTemplateAction, type AppliedItem } from "@/lib/actions/templates";
import { toast } from "sonner";
import type { TaskTemplate } from "@/lib/queries/templates";
import type { TaskSpace } from "@/lib/queries/tasks";

interface Member { id: string; label: string }
interface Status { id: string; label: string; color: string }

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: TaskTemplate | null;
  spaces: TaskSpace[];
  members?: Member[];
  statuses?: Status[];
  defaultListId?: string;
}

const NONE = "none";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function buildPreview(
  template: TaskTemplate,
  referenceDate: string,
  firstStatusId: string | null,
): AppliedItem[] {
  const result: AppliedItem[] = [];

  for (const root of template.items) {
    result.push({
      template_item_id: root.id,
      title: root.title,
      assignee_id: root.default_assignee_id ?? null,
      due_date: root.day_offset > 0 ? addDays(referenceDate, root.day_offset) : null,
      status_id: root.default_status_id ?? firstStatusId,
      priority: root.priority,
      estimate_points: root.estimate_points ?? null,
      parent_template_item_id: null,
    });

    for (const child of root.children) {
      result.push({
        template_item_id: child.id,
        title: child.title,
        assignee_id: child.default_assignee_id ?? null,
        due_date: child.day_offset > 0 ? addDays(referenceDate, child.day_offset) : null,
        status_id: child.default_status_id ?? firstStatusId,
        priority: child.priority,
        estimate_points: child.estimate_points ?? null,
        parent_template_item_id: root.id,
      });
    }
  }

  return result;
}

export function ApplyTemplateDialog({
  open,
  onOpenChange,
  template,
  spaces,
  members = [],
  statuses = [],
  defaultListId,
}: ApplyTemplateDialogProps) {
  const allLists = spaces.flatMap((s) =>
    s.lists.map((l) => ({ id: l.id, name: l.name, spaceName: s.name })),
  );

  const [step, setStep] = useState<1 | 2>(1);
  const [listId, setListId] = useState(defaultListId ?? allLists[0]?.id ?? "");
  const [referenceDate, setReferenceDate] = useState(todayStr());
  const [previewItems, setPreviewItems] = useState<AppliedItem[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setStep(1);
    onOpenChange(false);
  }

  function handleToPreview() {
    if (!template || !listId) return;
    const firstStatusId = statuses[0]?.id ?? null;
    setPreviewItems(buildPreview(template, referenceDate, firstStatusId));
    setStep(2);
  }

  function updateItem(index: number, patch: Partial<AppliedItem>) {
    setPreviewItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleApply() {
    if (!template || !listId) return;
    startTransition(async () => {
      const result = await applyTaskTemplateAction(template.id, previewItems, listId);
      if (result.error) {
        toast.error(result.error);
      } else {
        const n = result.tasksCreated ?? 0;
        toast.success(`${n} tarefa${n === 1 ? "" : "s"} criada${n === 1 ? "" : "s"}`);
        setStep(1);
        handleClose();
      }
    });
  }

  if (!template) return null;

  const totalTasks = previewItems.length || template.items.reduce(
    (acc, i) => acc + 1 + i.children.length, 0,
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? `Aplicar: ${template.name}` : "Rever tarefas a criar"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          /* ── ETAPA 1 — Configuração ── */
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Lista de destino</Label>
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolhe uma lista..." />
                </SelectTrigger>
                <SelectContent>
                  {allLists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.spaceName} / {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Data de referência{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  — usada para calcular deadlines (dia 0 = sem prazo)
                </span>
              </Label>
              <Input
                type="date"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
                className="w-48"
              />
            </div>

            {/* Preview rápido do template */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-1 max-h-48 overflow-y-auto">
              {template.items.map((item) => (
                <div key={item.id}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium truncate">{item.title}</span>
                    {item.day_offset > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        +{item.day_offset}d
                      </span>
                    )}
                    {item.estimate_points && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {item.estimate_points}pts
                      </span>
                    )}
                  </div>
                  {item.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground pl-4 mt-0.5"
                    >
                      <ChevronRight className="size-3 shrink-0" />
                      <span className="truncate">{child.title}</span>
                      {child.day_offset > 0 && (
                        <span className="shrink-0">+{child.day_offset}d</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleToPreview} disabled={!listId}>
                Ver preview
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── ETAPA 2 — Preview editável ── */
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Edita os campos antes de criar. Data de referência:{" "}
              <span className="font-medium text-foreground">{referenceDate}</span>
            </p>

            <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
              {previewItems.map((item, index) => {
                const isChild = !!item.parent_template_item_id;
                return (
                  <div
                    key={item.template_item_id}
                    className={`rounded-md border p-2.5 space-y-2 ${isChild ? "ml-6 bg-muted/10" : "bg-muted/20"}`}
                  >
                    {isChild && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                        <ChevronRight className="size-3" />
                        subtarefa
                      </div>
                    )}

                    {/* Título */}
                    <Input
                      value={item.title}
                      onChange={(e) => updateItem(index, { title: e.target.value })}
                      className="h-8 text-sm"
                    />

                    {/* Campos secundários */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Assignee */}
                      <Select
                        value={item.assignee_id ?? NONE}
                        onValueChange={(v) =>
                          updateItem(index, { assignee_id: v === NONE ? null : v })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
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

                      {/* Due date */}
                      <Input
                        type="date"
                        value={item.due_date ?? ""}
                        onChange={(e) =>
                          updateItem(index, { due_date: e.target.value || null })
                        }
                        className="h-7 text-xs"
                      />

                      {/* Status */}
                      <Select
                        value={item.status_id ?? NONE}
                        onValueChange={(v) =>
                          updateItem(index, { status_id: v === NONE ? null : v })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>—</SelectItem>
                          {statuses.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isPending}
              >
                <ChevronLeft className="size-4 mr-1" />
                Voltar
              </Button>
              <Button onClick={handleApply} disabled={isPending}>
                {isPending
                  ? "A criar..."
                  : `Criar ${totalTasks} tarefa${totalTasks === 1 ? "" : "s"}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
