"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveDailyStandupAction(input: {
  yesterday: string;
  today: string;
  blockers: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const date = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_standups")
    .upsert(
      { user_id: user.id, date, ...input },
      { onConflict: "user_id,date" },
    )
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { data };
}
