import { createClient } from "@/lib/supabase/server";
import type { TimeLog } from "@/lib/types";

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
