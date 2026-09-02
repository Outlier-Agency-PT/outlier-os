import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MemberMetrics {
  member_id: string;
  full_name: string;
  avatar_url: string | null;
  tarefas_criadas: number;
  tarefas_realizadas: number;
  tarefas_em_atraso: number;
  horas_realizadas_minutos: number;
  horas_estimadas: number;
}

export interface WorkedTask {
  id: string;
  title: string;
  assignee_id: string | null;
  assignees: string[] | null;
  estimate_points: number | null;
  status_id: string | null;
  status_label: string | null;
  status_key: string | null;
  total_duration_minutes: number;
  worked_by: string[];
}

export interface TeamMetricsResult {
  members: MemberMetrics[];
  global: {
    tarefas_criadas: number;
    tarefas_realizadas: number;
    tarefas_em_atraso: number;
    horas_realizadas_minutos: number;
    horas_estimadas: number;
  };
  workedTasks: WorkedTask[];
}

type TaskRow = {
  id: string;
  assignee_id: string | null;
  assignees: string[] | null;
  estimate_points?: number | null;
};
type LogRow = { member_id: string; task_id: string; duration_minutes: number | null };
type MemberRow = { id: string; full_name: string; avatar_url: string | null };

function memberIsAssigned(task: Pick<TaskRow, "assignee_id" | "assignees">, memberId: string): boolean {
  return task.assignee_id === memberId || (task.assignees ?? []).includes(memberId);
}

// Core implementation — accepts any compatible Supabase client.
async function fetchTeamMetrics(
  supabase: ReturnType<typeof createAdminClient>,
  periodStart: Date,
  periodEnd: Date,
  concludedStatusId: string | null,
): Promise<TeamMetricsResult> {
  const today = new Date().toISOString().slice(0, 10);
  const startISO = periodStart.toISOString();
  const endISO = periodEnd.toISOString();

  let baseOverdue = supabase
    .from("tasks")
    .select("id, assignee_id, assignees")
    .not("due_date", "is", null)
    .lt("due_date", today)
    .is("completed_at", null);
  if (concludedStatusId) {
    baseOverdue = baseOverdue.neq("status_id", concludedStatusId);
  }

  const [
    { data: membersData },
    { data: createdData },
    overdueResult,
    { data: logsData },
  ] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, avatar_url")
      .eq("active", true)
      .order("full_name"),

    supabase
      .from("tasks")
      .select("id, assignee_id, assignees, estimate_points")
      .gte("created_at", startISO)
      .lt("created_at", endISO),

    baseOverdue,

    supabase
      .from("task_time_logs")
      .select("member_id, task_id, duration_minutes")
      .gte("start_at", startISO)
      .lt("start_at", endISO)
      .not("end_at", "is", null),
  ]);

  const members = (membersData ?? []) as MemberRow[];
  const created = (createdData ?? []) as TaskRow[];
  const overdue = ((overdueResult as { data: unknown[] | null }).data ?? []) as TaskRow[];
  const logs = (logsData ?? []) as LogRow[];

  // Build worked tasks: distinct tasks with time logs in the window + status info
  const workedTaskIds = [...new Set(logs.map((l) => l.task_id))];

  type RawWorkedTask = {
    id: string;
    title: string;
    assignee_id: string | null;
    assignees: string[] | null;
    estimate_points: number | null;
    status_id: string | null;
    task_statuses: { label: string; key: string } | { label: string; key: string }[] | null;
  };

  let workedTasks: WorkedTask[] = [];
  if (workedTaskIds.length > 0) {
    const { data: workedRaw } = await supabase
      .from("tasks")
      .select("id, title, assignee_id, assignees, estimate_points, status_id, task_statuses(label, key)")
      .in("id", workedTaskIds);

    workedTasks = ((workedRaw ?? []) as unknown as RawWorkedTask[])
      .map((t) => {
        const status = Array.isArray(t.task_statuses) ? t.task_statuses[0] : t.task_statuses;
        const taskLogs = logs.filter((l) => l.task_id === t.id);
        return {
          id: t.id,
          title: t.title,
          assignee_id: t.assignee_id,
          assignees: t.assignees,
          estimate_points: t.estimate_points,
          status_id: t.status_id,
          status_label: status?.label ?? null,
          status_key: status?.key ?? null,
          total_duration_minutes: taskLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0),
          worked_by: [...new Set(taskLogs.map((l) => l.member_id))],
        };
      })
      .sort((a, b) => b.total_duration_minutes - a.total_duration_minutes);
  }

  const memberMetrics: MemberMetrics[] = members.map((m) => {
    const memberTaskIds = [...new Set(logs.filter((l) => l.member_id === m.id).map((l) => l.task_id))];
    return {
      member_id: m.id,
      full_name: m.full_name,
      avatar_url: m.avatar_url,
      tarefas_criadas: created.filter((t) => memberIsAssigned(t, m.id)).length,
      tarefas_realizadas: memberTaskIds.length,
      tarefas_em_atraso: overdue.filter((t) => memberIsAssigned(t, m.id)).length,
      horas_realizadas_minutos: logs
        .filter((l) => l.member_id === m.id)
        .reduce((s, l) => s + (l.duration_minutes ?? 0), 0),
      horas_estimadas: workedTasks
        .filter((wt) => wt.worked_by.includes(m.id))
        .reduce((s, wt) => s + (wt.estimate_points ?? 0), 0),
    };
  });

  return {
    members: memberMetrics,
    global: {
      tarefas_criadas: created.length,
      tarefas_realizadas: workedTaskIds.length,
      tarefas_em_atraso: overdue.length,
      horas_realizadas_minutos: logs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0),
      horas_estimadas: workedTasks.reduce((s, wt) => s + (wt.estimate_points ?? 0), 0),
    },
    workedTasks,
  };
}

// For authenticated pages — uses the user's session (respects RLS).
export async function getTeamMetrics(
  periodStart: Date,
  periodEnd: Date,
  concludedStatusId: string | null,
): Promise<TeamMetricsResult> {
  const supabase = await createClient();
  return fetchTeamMetrics(supabase as ReturnType<typeof createAdminClient>, periodStart, periodEnd, concludedStatusId);
}

// For cron/server routes — uses service role, bypasses RLS.
export async function getTeamMetricsAdmin(
  periodStart: Date,
  periodEnd: Date,
  concludedStatusId: string | null,
): Promise<TeamMetricsResult> {
  const supabase = createAdminClient();
  return fetchTeamMetrics(supabase, periodStart, periodEnd, concludedStatusId);
}

// ── Overdue tasks ───────────────────────────────────────────────────────────

export interface OverdueTask {
  id: string;
  title: string;
  due_date: string;
  assignee_id: string | null;
  assignee_name: string | null;
  days_overdue: number;
}

export async function fetchOverdueTasks(
  concludedStatusId: string | null,
): Promise<OverdueTask[]> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("tasks")
    .select("id, title, due_date, assignee_id, completed_at, status_id, team_members!tasks_assignee_id_fkey(full_name)")
    .not("due_date", "is", null)
    .lt("due_date", today)
    .is("completed_at", null)
    .order("due_date", { ascending: true });

  if (concludedStatusId) {
    query = query.neq("status_id", concludedStatusId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const todayMs = new Date(today).getTime();

  type RawRow = {
    id: string;
    title: string;
    due_date: string;
    assignee_id: string | null;
    completed_at: string | null;
    status_id: string | null;
    team_members: { full_name: string }[] | { full_name: string } | null;
  };

  return (data as unknown as RawRow[]).map((row) => {
    const member = Array.isArray(row.team_members)
      ? row.team_members[0] ?? null
      : row.team_members;
    return {
      id: row.id,
      title: row.title,
      due_date: row.due_date,
      assignee_id: row.assignee_id,
      assignee_name: member?.full_name ?? null,
      days_overdue: Math.floor((todayMs - new Date(row.due_date).getTime()) / 86_400_000),
    };
  });
}
