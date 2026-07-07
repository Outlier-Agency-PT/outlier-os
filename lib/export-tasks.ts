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
  "Estimativa (pts)",
  "Lista",
  "Espaço",
  "Criado em",
];

interface ExportableTask {
  title: string;
  status?: { label: string } | null;
  priority: string;
  assignees?: string[] | null;
  assignee_id?: string | null;
  due_date?: string | null;
  estimate_points?: number | null;
  created_at: string;
}

interface ExportMember {
  id: string;
  label: string;
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
  const lines = [EXPORT_HEADERS, ...rows].map((row) => row.map(csvEscape).join(","));
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
