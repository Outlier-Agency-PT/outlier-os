import { createClient } from "@/lib/supabase/server";
import type { TaskPriority, TimeLog } from "@/lib/types";
import type { TaskWithRelations } from "@/lib/queries/tasks";

export interface DailyStandup {
  id: string;
  user_id: string;
  date: string;
  yesterday: string | null;
  today: string | null;
  blockers: string | null;
  created_at: string;
}

export interface TimeLogWithTask extends TimeLog {
  task: { id: string; title: string } | null;
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgente: 4,
  alta: 3,
  media: 2,
  baixa: 1,
  sem_prioridade: 0,
};

export async function getConcludedStatusId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_statuses")
    .select("id")
    .eq("key", "concluido")
    .maybeSingle();
  return data?.id ?? null;
}

export async function getMyOpenTasks(userId: string): Promise<TaskWithRelations[]> {
  const supabase = await createClient();
  const concludedStatusId = await getConcludedStatusId();

  let query = supabase
    .from("tasks")
    .select(
      `
      *,
      estimate_points,
      status:task_statuses(id, key, label, color),
      client:clients(id, name),
      assignee:team_members!tasks_assignee_id_fkey(id, full_name, email)
      `,
    )
    .or(`assignee_id.eq.${userId},assignees.cs.{${userId}}`);

  if (concludedStatusId) {
    query = query.neq("status_id", concludedStatusId);
  }

  const { data } = await query;
  const tasks = (data ?? []) as TaskWithRelations[];

  return tasks.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
}

export async function getTodayStandup(userId: string): Promise<DailyStandup | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("daily_standups")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
  return data as DailyStandup | null;
}

function startOfWeekISO(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

export async function getWeekTimeMinutes(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_time_logs")
    .select("duration_minutes")
    .eq("member_id", userId)
    .gte("start_at", startOfWeekISO());

  return (data ?? []).reduce(
    (sum: number, l: { duration_minutes: number | null }) => sum + (l.duration_minutes ?? 0),
    0,
  );
}

export async function getMyRunningTimeLog(userId: string): Promise<TimeLogWithTask | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_time_logs")
    .select(`*, task:tasks(id, title)`)
    .eq("member_id", userId)
    .is("end_at", null)
    .maybeSingle();
  return data as TimeLogWithTask | null;
}

export async function getMyRecentTimeLogs(userId: string, limit = 5): Promise<TimeLogWithTask[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_time_logs")
    .select(`*, task:tasks(id, title)`)
    .eq("member_id", userId)
    .order("start_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as TimeLogWithTask[];
}
