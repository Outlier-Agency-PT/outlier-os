"use server";

import { createClient } from "@/lib/supabase/server";
import type { TimeLogWithTask } from "@/lib/queries/dashboard-colaborador";

export async function getRecentLogsAction(): Promise<TimeLogWithTask[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 84); // 12 semanas
  cutoff.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("task_time_logs")
    .select(`*, task:tasks(id, title, description, estimate_points)`)
    .eq("member_id", user.id)
    .gte("start_at", cutoff.toISOString())
    .order("start_at", { ascending: false });

  return (data ?? []) as TimeLogWithTask[];
}
