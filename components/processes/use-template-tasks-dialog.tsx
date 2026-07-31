"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTemplateAsTasksAction } from "@/app/actions/processes";
import type { TeamMember } from "@/lib/types";

export interface ListOption {
  id: string;
  name: string;
  spaceName: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contentMd: string;
  templateId: string;
  lists: ListOption[];
  members: TeamMember[];
}

export function UseTemplateTasksDialog({
  open,
  onOpenChange,
  contentMd,
  templateId,
  lists,
  members,
}: Props) {
  const [listId, setListId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const itemCount = contentMd
    .split("\n")
    .filter((l) => /^[-*]\s+.+/.test(l)).length;

  function handleSubmit() {
    if (!listId) {
      toast.error("Selecciona uma lista de destino.");
      return;
    }
    startTransition(async () => {
      const result = await useTemplateAsTasksAction(templateId, contentMd, {
        listId,
        assigneeId: assigneeId === "none" || !assigneeId ? undefined : assigneeId,
        dueDate: dueDate || undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.count} tarefas criadas com sucesso.`);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar tarefas a partir do template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {itemCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              Serão criadas <strong>{itemCount} tarefas</strong> a partir dos
              itens deste template.
            </p>
          ) : (
            <p className="text-sm text-destructive">
              Este template não tem itens de lista (- item). Adiciona itens
              antes de usar como tarefas.
            </p>
          )}

          {/* Lista de destino */}
          <div className="space-y-1.5">
            <Label>Lista de destino *</Label>
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar lista..." />
              </SelectTrigger>
              <SelectContent>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.spaceName} — {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsável */}
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name ?? m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data limite */}
          <div className="space-y-1.5">
            <Label>Data limite</Label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || itemCount === 0}
          >
            {isPending ? "A criar tarefas..." : `Criar ${itemCount} tarefas`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
