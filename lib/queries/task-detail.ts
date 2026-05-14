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
