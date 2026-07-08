"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/types";
import {
  ALL_EXPORT_PRIORITIES,
  DEFAULT_EXPORT_FILTERS,
  applyExportFilters,
  buildExportFilename,
  buildExportRows,
  exportTasksToCSV,
  exportTasksToPDF,
  type ExportDueDateFilter,
  type ExportFilters,
  type ExportableTask,
} from "@/lib/export-tasks";

const DUE_DATE_OPTIONS: { value: ExportDueDateFilter; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "todas", label: "Todas as datas" },
];

interface ExportFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format: "csv" | "pdf" | null;
  tasks: ExportableTask[];
  members: { id: string; label: string }[];
  spaceName: string;
  listName: string;
}

export function ExportFilterModal({
  open,
  onOpenChange,
  format,
  tasks,
  members,
  spaceName,
  listName,
}: ExportFilterModalProps) {
  const [filters, setFilters] = useState<ExportFilters>(DEFAULT_EXPORT_FILTERS);

  function togglePriority(priority: TaskPriority) {
    setFilters((prev) => {
      const hasPriority = prev.priorities.includes(priority);
      const priorities = hasPriority
        ? prev.priorities.filter((p) => p !== priority)
        : [...prev.priorities, priority];
      return { ...prev, priorities };
    });
  }

  function handleCancel() {
    onOpenChange(false);
    setFilters(DEFAULT_EXPORT_FILTERS);
  }

  function handleExport() {
    if (!format) return;

    const filteredTasks = applyExportFilters(tasks, filters);
    const rows = buildExportRows(filteredTasks, members, spaceName, listName);
    const filename = buildExportFilename(format, filters, members);

    if (format === "csv") {
      exportTasksToCSV(rows, filename);
    } else {
      exportTasksToPDF(rows, `Tarefas — ${spaceName} / ${listName}`, filename);
    }

    onOpenChange(false);
    setFilters(DEFAULT_EXPORT_FILTERS);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : handleCancel())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar {format === "pdf" ? "PDF" : "CSV"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select
              value={filters.assigneeId}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, assigneeId: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EXPORT_PRIORITIES.map((priority) => (
                <label key={priority} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.priorities.includes(priority)}
                    onChange={() => togglePriority(priority)}
                    className="size-4 rounded cursor-pointer"
                  />
                  {PRIORITY_LABELS[priority]}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Data limite</Label>
            <div className="grid grid-cols-2 gap-2">
              {DUE_DATE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="export-due-date"
                    checked={filters.dueDate === opt.value}
                    onChange={() => setFilters((prev) => ({ ...prev, dueDate: opt.value }))}
                    className="size-4 cursor-pointer"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="export-include-subtasks" className="cursor-pointer">
              Incluir subtarefas
            </Label>
            <Switch
              id="export-include-subtasks"
              checked={filters.includeSubtasks}
              onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, includeSubtasks: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={filters.priorities.length === 0}>
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
