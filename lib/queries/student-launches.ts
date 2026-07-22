import { createClient } from "@/lib/supabase/server";

// Re-exporta tipos e calcDebrief do ficheiro partilhado (sem server-only deps)
export type {
  StudentProduct,
  StudentLaunch,
  StudentLaunchDebrief,
  DebriefCalculated,
  LaunchStatus,
} from "@/lib/types/student-launches";
export { calcDebrief } from "@/lib/types/student-launches";

// ── Queries (server-only) ─────────────────────────────────────────────────────

import type { StudentProduct, StudentLaunch, StudentLaunchDebrief } from "@/lib/types/student-launches";

export async function getStudentProducts(studentId: string): Promise<StudentProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_products")
    .select("*")
    .eq("student_id", studentId)
    .order("value_ladder_position", { ascending: true, nullsFirst: false });
  return (data ?? []) as StudentProduct[];
}

export async function getStudentLaunches(studentId: string): Promise<StudentLaunch[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_launches")
    .select("*")
    .eq("student_id", studentId)
    .order("launch_date", { ascending: false, nullsFirst: false });
  return (data ?? []) as StudentLaunch[];
}

export async function getLaunchDebrief(
  launchId: string,
): Promise<StudentLaunchDebrief | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_launch_debriefs")
    .select("*")
    .eq("launch_id", launchId)
    .maybeSingle();
  return (data ?? null) as StudentLaunchDebrief | null;
}

export async function getPendingLaunchDeletions(): Promise<
  { id: string; title: string; student_id: string; deletion_requested_at: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_launches")
    .select("id, title, student_id, deletion_requested_at")
    .not("deletion_requested_at", "is", null)
    .order("deletion_requested_at", { ascending: true });
  return (data ?? []) as any[];
}
