"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleChecklistItem(
  processId: string,
  itemIndex: number,
  completed: boolean
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  if (completed) {
    await supabase
      .from("checklist_progress")
      .upsert({
        process_id: processId,
        user_id: user.id,
        item_index: itemIndex,
      }, { onConflict: "process_id,user_id,item_index" });
  } else {
    await supabase
      .from("checklist_progress")
      .delete()
      .eq("process_id", processId)
      .eq("user_id", user.id)
      .eq("item_index", itemIndex);
  }

  revalidatePath(`/processos/${processId}`);
}
