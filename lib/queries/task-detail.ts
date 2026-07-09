import { createClient } from "@/lib/supabase/server";
import type { TimeLog } from "@/lib/types";

export interface TaskActivity {
  id: string;
  member_id: string | null;
  action: string;
  entity_label: string | null;
  metadata: Record<string, string> | null;
  created_at: string;
  member: { full_name: string } | null;
  description: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  sem_prioridade: "sem prioridade",
  baixa: "baixa",
  media: "média",
  alta: "alta",
  urgente: "urgente",
};

function describeTaskActivity(action: string, metadata: Record<string, string> | null): string {
  if (action === "created") return "criou a tarefa";
  if (action === "deleted") return "eliminou a tarefa";
  if (action === "updated" && metadata?.field) {
    const from = metadata.from ?? "—";
    const to = metadata.to ?? "—";
    switch (metadata.field) {
      case "status_id":
        return `mudou o estado de "${from}" para "${to}"`;
      case "priority":
        return `mudou a prioridade de "${PRIORITY_LABELS[from] ?? from}" para "${PRIORITY_LABELS[to] ?? to}"`;
      case "due_date":
        return `mudou a data limite de ${from === "null" || !from ? "nenhuma" : from} para ${to === "null" || !to ? "nenhuma" : to}`;
      case "estimate_points":
        return `mudou a estimativa de ${from} para ${to}`;
      case "assignees":
        return "actualizou os responsáveis";
      case "list_id":
        return "moveu a tarefa para outra lista";
      default:
        return `actualizou ${metadata.field}`;
    }
  }
  return "actualizou a tarefa";
}

export async function getActivityForTask(taskId: string): Promise<TaskActivity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_log")
    .select(`*, member:team_members(full_name)`)
    .eq("entity_type", "tasks")
    .eq("entity_id", taskId)
    .order("created_at", { ascending: false })
    .limit(50);

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    description: describeTaskActivity(row.action, row.metadata),
  })) as TaskActivity[];
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  author: { id: string; full_name: string } | null;
}

export interface TimeLogWithMember extends TimeLog {
  member: { id: string; full_name: string } | null;
}

export async function getTaskTimeLogs(taskId: string): Promise<TimeLogWithMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_time_logs")
    .select(`*, member:team_members(id, full_name)`)
    .eq("task_id", taskId)
    .order("start_at", { ascending: false });
  return (data ?? []) as TimeLogWithMember[];
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_comments")
    .select(`*, author:team_members(id, full_name)`)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  return (data ?? []) as TaskComment[];
}

export type TaskDependencyType = "blocks" | "blocked_by" | "related";

export interface TaskDependencyRef {
  id: string;
  title: string;
  completed_at: string | null;
  status: { id: string; label: string; color: string } | null;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_id: string;
  type: TaskDependencyType;
  created_at: string;
  depends_on: TaskDependencyRef | null;
}

export async function getTaskDependencies(taskId: string): Promise<TaskDependency[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_dependencies")
    .select(
      `
      *,
      depends_on:tasks!task_dependencies_depends_on_id_fkey(id, title, completed_at, status:task_statuses(id, label, color))
      `,
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as TaskDependency[];
}
