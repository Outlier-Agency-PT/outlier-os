"use server";

import { createClient } from "@/lib/supabase/server";
import type { TimeLogWithTask } from "@/lib/queries/dashboard-colaborador";

export async function getRecentLogsAction(): Promise<TimeLogWithTask[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("task_time_logs")
    .select(`*, task:tasks(id, title, description, estimate_points)`)
    .eq("member_id", user.id)
    .gte("start_at", weekStart.toISOString())
    .order("start_at", { ascending: false });

  return (data ?? []) as TimeLogWithTask[];
}
