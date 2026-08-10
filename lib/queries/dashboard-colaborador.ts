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
  task: { id: string; title: string; description: string | null; estimate_points: number | null } | null;
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

export async function getMyOpenTasks(userId: string, concludedStatusId?: string | null): Promise<TaskWithRelations[]> {
  const supabase = await createClient();
  const concludedId = concludedStatusId !== undefined ? concludedStatusId : await getConcludedStatusId();

  const SELECT = `
      *,
      estimate_points,
      status:task_statuses(id, key, label, color),
      client:clients(id, name),
      assignee:team_members!tasks_assignee_id_fkey(id, full_name, email)
      `;

  const baseById = supabase.from("tasks").select(SELECT).eq("assignee_id", userId);
  const baseByArray = supabase.from("tasks").select(SELECT).contains("assignees", [userId]);

  const [{ data: byId, error: errById }, { data: byArray, error: errByArray }] =
    await Promise.all([
      concludedId ? baseById.neq("status_id", concludedId) : baseById,
      concludedId ? baseByArray.neq("status_id", concludedId) : baseByArray,
    ]);

  if (errById)
    console.error("[getMyOpenTasks] assignee_id query:", errById.message);
  if (errByArray)
    console.error("[getMyOpenTasks] assignees array query:", errByArray.message);

  const seen = new Set<string>();
  const tasks: TaskWithRelations[] = [];
  for (const t of [...(byId ?? []), ...(byArray ?? [])] as TaskWithRelations[]) {
    if (!seen.has(t.id)) { seen.add(t.id); tasks.push(t); }
  }

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

export async function getTodayTimeMinutes(userId: string): Promise<number> {
  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("task_time_logs")
    .select("duration_minutes")
    .eq("member_id", userId)
    .gte("start_at", todayStart.toISOString());

  return (data ?? []).reduce(
    (sum: number, l: { duration_minutes: number | null }) => sum + (l.duration_minutes ?? 0),
    0,
  );
}

export async function getMyRunningTimeLog(userId: string): Promise<TimeLogWithTask | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_time_logs")
    .select(`*, task:tasks(id, title, description, estimate_points)`)
    .eq("member_id", userId)
    .is("end_at", null)
    .maybeSingle();
  return data as TimeLogWithTask | null;
}

export async function getMyRecentTimeLogs(userId: string): Promise<TimeLogWithTask[]> {
  const supabase = await createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 84); // 12 semanas
  cutoff.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("task_time_logs")
    .select(`*, task:tasks(id, title, description, estimate_points)`)
    .eq("member_id", userId)
    .gte("start_at", cutoff.toISOString())
    .order("start_at", { ascending: false });
  return (data ?? []) as TimeLogWithTask[];
}

// ── Horas da equipa (admin) ───────────────────────────────────────────────────

export interface TeamMemberHours {
  member_id: string;
  full_name: string;
  week_minutes: number;
  today_minutes: number;
  has_running: boolean;
}

export async function getTeamWeeklyHours(weekStart: Date): Promise<TeamMemberHours[]> {
  const supabase = await createClient();

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ data: members }, { data: logs }] = await Promise.all([
    supabase.from("team_members").select("id, full_name").order("full_name"),
    supabase
      .from("task_time_logs")
      .select("member_id, duration_minutes, start_at, end_at")
      .gte("start_at", weekStart.toISOString())
      .lt("start_at", weekEnd.toISOString()),
  ]);

  if (!members || members.length === 0) return [];

  const map = new Map<string, TeamMemberHours>();
  for (const m of members as { id: string; full_name: string }[]) {
    map.set(m.id, { member_id: m.id, full_name: m.full_name, week_minutes: 0, today_minutes: 0, has_running: false });
  }

  for (const log of (logs ?? []) as { member_id: string; duration_minutes: number | null; start_at: string; end_at: string | null }[]) {
    const entry = map.get(log.member_id);
    if (!entry) continue;
    const mins = log.duration_minutes ?? 0;
    entry.week_minutes += mins;
    if (log.start_at >= todayStart.toISOString()) entry.today_minutes += mins;
    if (!log.end_at) entry.has_running = true;
  }

  return Array.from(map.values()).sort((a, b) => b.week_minutes - a.week_minutes);
}

// ── Extra dashboard blocks ────────────────────────────────────────────────────

export interface DashNotification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface DashOverdueTask {
  id: string;
  title: string;
  due_date: string;
}

export interface DashIncubadoraSummary {
  ativos: number;
  em_risco: number;
  tickets_abertos: number;
}

export interface DashRenewal {
  id: string;
  name: string;
  end_date: string;
  dias_restantes: number;
}

export async function getMyNotifications(userId: string): Promise<{
  items: DashNotification[];
  unread_count: number;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const items = (data ?? []) as DashNotification[];
  return {
    items,
    unread_count: items.filter((n) => !n.read).length,
  };
}

export async function getMyOverdueTasks(userId: string): Promise<DashOverdueTask[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("tasks")
    .select("id, title, due_date")
    .eq("assignee_id", userId)
    .lt("due_date", today)
    .is("completed_at", null)
    .order("due_date", { ascending: true })
    .limit(5);
  return (data ?? []) as DashOverdueTask[];
}

export async function getIncubadoraSummary(): Promise<DashIncubadoraSummary> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: ativos }, { data: recentStudentIds }, { count: tickets }, { data: activeStudents }] = await Promise.all([
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("status", "ativo"),
    supabase
      .from("lesson_completions")
      .select("student_id")
      .gte("completed_at", sevenDaysAgo),
    supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "aberto"),
    supabase
      .from("students")
      .select("user_id")
      .eq("status", "ativo")
      .not("user_id", "is", null),
  ]);

  const activeWithRecent = new Set((recentStudentIds ?? []).map((r: { student_id: string }) => r.student_id));

  const emRisco = (activeStudents ?? []).filter(
    (s: { user_id: string | null }) => s.user_id && !activeWithRecent.has(s.user_id),
  ).length;

  return {
    ativos: ativos ?? 0,
    em_risco: emRisco,
    tickets_abertos: tickets ?? 0,
  };
}

export async function getUpcomingRenewals(): Promise<DashRenewal[]> {
  const supabase = await createClient();
  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().slice(0, 10);
  const in30Str = in30.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("students")
    .select("id, name, end_date")
    .eq("status", "ativo")
    .gte("end_date", todayStr)
    .lte("end_date", in30Str)
    .order("end_date", { ascending: true })
    .limit(5);

  return ((data ?? []) as { id: string; name: string; end_date: string }[]).map((s) => {
    const end = new Date(s.end_date);
    const diff = Math.ceil((end.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
    return { ...s, dias_restantes: diff };
  });
}

// ── Tarefas de Hoje ───────────────────────────────────────────────────────────

export interface TodayTask {
  id: string;
  title: string;
  priority: "sem_prioridade" | "baixa" | "media" | "alta" | "urgente";
  estimate_points: number | null;
  status_id: string | null;
  status: {
    id: string;
    key: string;
    label: string;
    color: string;
  } | null;
}

export async function getTodayTasks(userId: string, concludedStatusId?: string | null): Promise<TodayTask[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const concludedId = concludedStatusId !== undefined ? concludedStatusId : await getConcludedStatusId();

  let query = supabase
    .from("tasks")
    .select(`
      id,
      title,
      priority,
      estimate_points,
      status_id,
      status:task_statuses(id, key, label, color)
    `)
    .eq("assignee_id", userId)
    .eq("due_date", today)
    .is("completed_at", null);

  if (concludedId) {
    query = query.neq("status_id", concludedId);
  }

  const { data, error } = await query.order("priority", { ascending: false });

  if (error) {
    console.error("[getTodayTasks]", error.message);
    return [];
  }
  return (data ?? []) as unknown as TodayTask[];
}
