"use server";

import { createClient } from "@/lib/supabase/server";
import { getStudentJourneyMilestones } from "@/lib/queries/milestones";
import type { JourneyMilestone } from "@/lib/queries/milestones";

// Aluno vê a sua própria jornada
export async function getStudentJourneyMilestonesAction(): Promise<JourneyMilestone[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: studentRow } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!studentRow) return [];

  return getStudentJourneyMilestones((studentRow as { id: string }).id);
}

// Coach/staff vê a jornada de um aluno pelo studentId
export async function getStudentMilestonesForCoachAction(
  studentId: string,
): Promise<JourneyMilestone[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  return getStudentJourneyMilestones(studentId);
}
