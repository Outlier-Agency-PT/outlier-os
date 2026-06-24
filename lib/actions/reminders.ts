"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeReminderAction(noteId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_notes")
    .update({ reminder_date: null })
    .eq("id", noteId);
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}
