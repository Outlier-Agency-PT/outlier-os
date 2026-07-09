"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStart, getCheckpointStatus } from "@/lib/queries/checkpoints";
import type { MemberCheckpointStatus } from "@/lib/queries/checkpoints";

export interface CheckpointInput {
  positive: string;
  achievements: string;
  challenges: string;
  improvements: string;
}

export async function createOrUpdateCheckpointAction(input: CheckpointInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const week_start = getCurrentWeekStart();

  const { data, error } = await supabase
    .from("weekly_checkpoints")
    .upsert(
      { member_id: user.id, week_start, ...input, updated_at: new Date().toISOString() },
      { onConflict: "member_id,week_start" },
    )
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { data };
}

export async function getCheckpointStatusAction(): Promise<MemberCheckpointStatus[]> {
  const weekStart = getCurrentWeekStart();
  return getCheckpointStatus(weekStart);
}
