"use server";

import { addDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEPARTMENTS = ["trafego", "incubadora", "vendas", "desenvolvimento"] as const;

// ─── 2. getOrCreateCheckpoint ─────────────────────────────────────────────────

export async function getOrCreateCheckpoint(department: string, weekStart: Date) {
  const admin = createAdminClient();
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const { data: existing } = await admin
    .from("weekly_checkpoints")
    .select("*")
    .eq("department", department)
    .eq("week_start", weekStartStr)
    .maybeSingle();

  if (existing) return existing;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await admin
    .from("weekly_checkpoints")
    .insert({
      department,
      week_start: weekStartStr,
      metrics: {},
      status: "draft",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

// ─── 3. getWeeklyCheckpoints ──────────────────────────────────────────────────

export async function getWeeklyCheckpoints(weekStart: Date) {
  const supabase = await createClient();
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("weekly_checkpoints")
    .select("*")
    .eq("week_start", weekStartStr)
    .in("department", [...DEPARTMENTS]);

  const map = new Map((data ?? []).map((c) => [c.department as string, c]));
  return DEPARTMENTS.map((d) => map.get(d) ?? null);
}

// ─── 4. getUserDepartments ────────────────────────────────────────────────────

export async function getUserDepartments(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: depts } = await supabase
    .from("team_member_departments")
    .select("department_code")
    .eq("team_member_id", user.id);

  if (depts && depts.length > 0) {
    return depts.map((d) => d.department_code as string);
  }

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user.id)
    .single();

  if (member?.role === "admin") {
    return [...DEPARTMENTS];
  }

  return [];
}

// ─── 5. updateCheckpointMetrics ───────────────────────────────────────────────

export async function updateCheckpointMetrics(
  id: string,
  metrics: Record<string, number | string>,
  notes?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: existing } = await supabase
    .from("weekly_checkpoints")
    .select("status")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Checkpoint não encontrado" };
  if (existing.status === "submitted") return { error: "Checkpoint já submetido" };

  const patch: Record<string, unknown> = {
    metrics,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  if (notes !== undefined) patch.notes = notes;

  const { error } = await supabase.from("weekly_checkpoints").update(patch).eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

// ─── 6. submitCheckpoint ─────────────────────────────────────────────────────

export async function submitCheckpoint(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: checkpoint } = await supabase
    .from("weekly_checkpoints")
    .select("*")
    .eq("id", id)
    .single();

  if (!checkpoint) return { error: "Checkpoint não encontrado" };
  if (checkpoint.status === "submitted") return { error: "Já submetido" };

  const admin = createAdminClient();
  let metrics = (checkpoint.metrics ?? {}) as Record<string, unknown>;

  if (checkpoint.department === "incubadora" || checkpoint.department === "desenvolvimento") {
    const weekStart = new Date(checkpoint.week_start + "T00:00:00Z");
    const weekEnd = addDays(weekStart, 7);
    const autoMetrics = await getAutoMetrics(checkpoint.department, weekStart, weekEnd);
    metrics = { ...metrics, ...autoMetrics, snapshot_time: new Date().toISOString() };
  }

  const { error } = await admin
    .from("weekly_checkpoints")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      updated_by: user.id,
      metrics,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

// ─── 7. getAutoMetrics ───────────────────────────────────────────────────────

export async function getAutoMetrics(
  department: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const weekStartStr = weekStart.toISOString();
  const weekEndStr = weekEnd.toISOString();

  if (department === "incubadora") {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: active_students },
        { data: recentLessons7 },
        { data: recentLessons14 },
        { data: revenueRows },
        { data: activeStudents },
        { count: level_progressions },
        { count: critical_cases },
      ] = await Promise.all([
        admin
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("status", "ativo"),
        admin
          .from("lesson_completions")
          .select("student_id")
          .gte("completed_at", sevenDaysAgo),
        admin
          .from("lesson_completions")
          .select("student_id")
          .gte("completed_at", fourteenDaysAgo),
        admin
          .from("student_revenue_history")
          .select("value")
          .gte("recorded_at", weekStartStr)
          .lt("recorded_at", weekEndStr),
        // user_id liga students a auth.users(id), tal como lesson_completions.student_id
        admin.from("students").select("user_id").eq("status", "ativo").not("user_id", "is", null),
        admin
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("status", "ativo")
          .gte("updated_at", weekStartStr)
          .lt("updated_at", weekEndStr),
        admin
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "aberto"),
      ]);

      const recentIds7 = new Set((recentLessons7 ?? []).map((r) => r.student_id as string));
      const recentIds14 = new Set((recentLessons14 ?? []).map((r) => r.student_id as string));
      const allActiveUserIds = (activeStudents ?? []).map((s) => s.user_id as string);

      const students_at_risk = allActiveUserIds.filter((id) => !recentIds7.has(id)).length;
      const imminent_dropout = allActiveUserIds.filter((id) => !recentIds14.has(id)).length;
      const new_student_revenue = (revenueRows ?? []).reduce(
        (sum, r) => sum + Number(r.value),
        0,
      );

      return {
        active_students: active_students ?? 0,
        students_at_risk,
        imminent_dropout,
        new_student_revenue,
        level_progressions: level_progressions ?? 0,
        coaching_interactions: 0,
        critical_cases: critical_cases ?? 0,
      };
    } catch {
      return {
        active_students: 0,
        students_at_risk: 0,
        imminent_dropout: 0,
        new_student_revenue: 0,
        level_progressions: 0,
        coaching_interactions: 0,
        critical_cases: 0,
      };
    }
  }

  if (department === "desenvolvimento") {
    try {
      const today = new Date().toISOString().slice(0, 10);

      const [
        { count: tasks_completed },
        { count: tasks_open },
        { count: tasks_overdue },
        { count: critical_incidents_open },
      ] = await Promise.all([
        admin
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .gte("completed_at", weekStartStr)
          .lt("completed_at", weekEndStr),
        admin
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .is("completed_at", null),
        admin
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .lt("due_date", today)
          .is("completed_at", null),
        admin
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "aberto"),
      ]);

      return {
        tasks_completed: tasks_completed ?? 0,
        tasks_open: tasks_open ?? 0,
        tasks_overdue: tasks_overdue ?? 0,
        releases_published: 0,
        bugs_fixed: 0,
        critical_incidents: 0,
        critical_incidents_open: critical_incidents_open ?? 0,
      };
    } catch {
      return {
        tasks_completed: 0,
        tasks_open: 0,
        tasks_overdue: 0,
        releases_published: 0,
        bugs_fixed: 0,
        critical_incidents: 0,
        critical_incidents_open: 0,
      };
    }
  }

  return {};
}
