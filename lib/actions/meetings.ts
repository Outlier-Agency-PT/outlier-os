"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const meetingSchema = z.object({
  title: z.string().min(1),
  client_id: z.string().uuid().nullable().optional(),
  scheduled_at: z.string(),
  duration_minutes: z.coerce.number().int().nullable().optional(),
  location: z.string().nullable().optional(),
  agenda_md: z.string().nullable().optional(),
  notes_md: z.string().nullable().optional(),
  attendee_ids: z.array(z.string().uuid()).optional(),
  student_ids: z.array(z.string().uuid()).optional(),
});

export type MeetingInput = z.infer<typeof meetingSchema>;

function clean<T extends Record<string, unknown>>(input: T) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    r[k] = v;
  }
  return r;
}

export async function createMeetingAction(input: MeetingInput) {
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { student_ids, ...meetingData } = parsed.data;

  const { data, error } = await supabase
    .from("meetings")
    .insert({ ...clean(meetingData), created_by: user.id })
    .select(`*, client:clients(id, name)`)
    .single();
  if (error) return { error: { _form: [error.message] } };

  if (student_ids && student_ids.length > 0) {
    await supabase.from("meeting_students").insert(
      student_ids.map((sid) => ({ meeting_id: data.id, student_id: sid })),
    );
  }

  revalidatePath("/reunioes");
  return { data };
}

export async function deleteMeetingAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/reunioes");
  return { success: true };
}

export async function addStudentToMeetingAction(meetingId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("meeting_students")
    .insert({ meeting_id: meetingId, student_id: studentId });
  if (error) {
    if (error.code === "23505")
      return { error: "Este aluno já está associado a esta reunião." };
    return { error: error.message };
  }
  revalidatePath("/reunioes");
  return { success: true };
}

export async function removeStudentFromMeetingAction(meetingId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("meeting_students")
    .delete()
    .eq("meeting_id", meetingId)
    .eq("student_id", studentId);
  if (error) return { error: error.message };
  revalidatePath("/reunioes");
  return { success: true };
}
