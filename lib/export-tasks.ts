import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const EXPORT_HEADERS = [
  "Título",
  "Status",
  "Prioridade",
  "Assignees",
  "Data Limite",
  "Estimativa (h)",
  "Lista",
  "Espaço",
  "Criado em",
];

export interface ExportableTask {
  title: string;
  status?: { label: string } | null;
  priority: string;
  assignees?: string[] | null;
  assignee_id?: string | null;
  due_date?: string | null;
  estimate_points?: number | null;
  created_at: string;
  subtasks?: ExportableTask[] | null;
}

interface ExportMember {
  id: string;
  label: string;
}

export type ExportDueDateFilter = "hoje" | "semana" | "mes" | "todas";

export interface ExportFilters {
  assigneeId: string; // id do membro ou "all"
  priorities: TaskPriority[];
  dueDate: ExportDueDateFilter;
  includeSubtasks: boolean;
}

export const ALL_EXPORT_PRIORITIES: TaskPriority[] = [
  "urgente",
  "alta",
  "media",
  "baixa",
  "sem_prioridade",
];

export const DEFAULT_EXPORT_FILTERS: ExportFilters = {
  assigneeId: "all",
  priorities: ALL_EXPORT_PRIORITIES,
  dueDate: "todas",
  includeSubtasks: false,
};

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function matchesDueDateFilter(dueDate: string | null | undefined, filter: ExportDueDateFilter): boolean {
  if (filter === "todas") return true;
  if (!dueDate) return false;

  const today = new Date();
  const todayISO = toISODate(today);

  if (filter === "hoje") {
    return dueDate === todayISO;
  }

  if (filter === "semana") {
    const diffToMonday = (today.getDay() + 6) % 7; // segunda como início da semana
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return dueDate >= toISODate(monday) && dueDate <= toISODate(sunday);
  }

  // mes
  return dueDate.slice(0, 7) === todayISO.slice(0, 7);
}

function taskMatchesFilters(task: ExportableTask, filters: ExportFilters): boolean {
  if (filters.assigneeId !== "all") {
    const assigneeIds = task.assignees && task.assignees.length > 0
      ? task.assignees
      : task.assignee_id
        ? [task.assignee_id]
        : [];
    if (!assigneeIds.includes(filters.assigneeId)) return false;
  }

  if (!filters.priorities.includes(task.priority as TaskPriority)) return false;

  if (!matchesDueDateFilter(task.due_date, filters.dueDate)) return false;

  return true;
}

/** Filtra as tarefas e, se pedido, junta as subtarefas de cada tarefa incluída (com indentação no título). */
export function applyExportFilters(tasks: ExportableTask[], filters: ExportFilters): ExportableTask[] {
  const result: ExportableTask[] = [];

  for (const task of tasks) {
    if (!taskMatchesFilters(task, filters)) continue;

    result.push(task);

    if (filters.includeSubtasks && task.subtasks && task.subtasks.length > 0) {
      for (const subtask of task.subtasks) {
        result.push({ ...subtask, title: `  → ${subtask.title}` });
      }
    }
  }

  return result;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Gera o nome do ficheiro incluindo o filtro dominante (responsável > data). */
export function buildExportFilename(
  extension: "csv" | "pdf",
  filters: ExportFilters,
  members: ExportMember[],
): string {
  const dateStr = toISODate(new Date());

  let scope = "tarefas";
  if (filters.assigneeId !== "all") {
    const memberName = members.find((m) => m.id === filters.assigneeId)?.label ?? "responsavel";
    scope = `tarefas-${slugify(memberName)}`;
  } else if (filters.dueDate !== "todas") {
    scope = `tarefas-${filters.dueDate}`;
  }

  return `${scope}-${dateStr}.${extension}`;
}

export function buildExportRows(
  tasks: ExportableTask[],
  members: ExportMember[],
  spaceName: string,
  listName: string,
): string[][] {
  const memberMap = new Map(members.map((m) => [m.id, m.label]));

  return tasks.map((t) => {
    const assigneeIds = t.assignees && t.assignees.length > 0
      ? t.assignees
      : t.assignee_id
        ? [t.assignee_id]
        : [];
    const assigneeNames = assigneeIds.map((id) => memberMap.get(id) ?? "—").join(", ");

    return [
      t.title,
      t.status?.label ?? "—",
      PRIORITY_LABELS[t.priority as TaskPriority] ?? t.priority,
      assigneeNames || "—",
      t.due_date ?? "—",
      t.estimate_points != null ? String(t.estimate_points) : "—",
      listName,
      spaceName,
      formatDate(t.created_at),
    ];
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function exportTasksToCSV(rows: string[][], filename: string) {
  const lines = [EXPORT_HEADERS, ...rows].map((row) => row.map(csvEscape).join(";"));
  // BOM no início para o Excel reconhecer acentuação UTF-8 correctamente
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

export function exportTasksToPDF(rows: string[][], title: string, filename: string) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(title, 14, 16);

  autoTable(doc, {
    startY: 22,
    head: [EXPORT_HEADERS],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  const generatedAt = new Date().toLocaleString("pt-PT");
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Gerado em ${generatedAt}`, 14, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(filename);
}
