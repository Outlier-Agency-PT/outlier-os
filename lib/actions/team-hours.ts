"use server";

import { createClient } from "@/lib/supabase/server";
import { getTeamWeeklyHours, getMyRecentTimeLogs, getMyRunningTimeLog, type TeamMemberHours, type TimeLogWithTask } from "@/lib/queries/dashboard-colaborador";

export async function fetchTeamWeeklyHoursAction(weekStartISO: string): Promise<TeamMemberHours[]> {
  return getTeamWeeklyHours(new Date(weekStartISO));
}

export interface MemberTask {
  id: string;
  title: string;
  description: string | null;
  estimate_points: number | null;
  assignee_name: string | null;
}

export async function fetchMemberCompletedTasksAction(memberId: string, weekStartISO: string): Promise<MemberTask[]> {
  const supabase = await createClient();
  const weekStart = new Date(weekStartISO);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const concludedStatus = await supabase
    .from("task_statuses")
    .select("id")
    .eq("key", "concluido")
    .maybeSingle();

  if (!concludedStatus.data?.id) return [];

  const { data } = await supabase
    .from("tasks")
    .select("id, title, description, estimate_points")
    .eq("status_id", concludedStatus.data.id)
    .contains("assignees", [memberId])
    .gte("updated_at", weekStart.toISOString())
    .lt("updated_at", weekEnd.toISOString())
    .order("updated_at", { ascending: false });

  return (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    estimate_points: t.estimate_points,
    assignee_name: null,
  }));
}

export async function fetchMemberLogsAction(memberId: string): Promise<{
  recentLogs: TimeLogWithTask[];
  runningLog: TimeLogWithTask | null;
}> {
  const [recentLogs, runningLog] = await Promise.all([
    getMyRecentTimeLogs(memberId),
    getMyRunningTimeLog(memberId),
  ]);
  return { recentLogs, runningLog };
}
