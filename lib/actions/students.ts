"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const studentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  nicho: z.string().nullable().optional(),
  subnicho: z.string().nullable().optional(),
  coach_id: z.string().uuid().nullable().optional(),
  level: z.enum(["aprendiz", "fazedor", "autoridade", "referencia", "aguardar"]).default("aprendiz"),
  turma: z.string().nullable().optional(),
  entry_type: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  briefing: z.string().nullable().optional(),
});

export type StudentInput = z.infer<typeof studentSchema>;

function clean<T extends Record<string, unknown>>(input: T) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    r[k] = v;
  }
  return r;
}

export async function createStudentAction(input: StudentInput) {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data, error } = await supabase
    .from("students")
    .insert({ ...clean(parsed.data), created_by: user.id })
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };

  // Auto-criar sessions placeholder para todos os tipos
  const studentId = (data as { id: string }).id;
  const { data: types } = await supabase.from("student_session_types").select("id").eq("active", true);
  if (types && types.length > 0) {
    const sessions = (types as { id: string }[]).map((t) => ({
      student_id: studentId,
      type_id: t.id,
    }));
    await supabase.from("student_sessions").insert(sessions);
  }

  revalidatePath("/incubadora");
  return { data };
}

export async function updateStudentAction(id: string, input: Partial<StudentInput>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .update(clean(input))
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/incubadora");
  revalidatePath(`/incubadora/${id}`);
  return { data };
}

export async function deleteStudentAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/incubadora");
  return { success: true };
}

export async function updateSessionAction(
  id: string,
  data: { scheduled_date?: string | null; completed_at?: string | null; notes?: string | null },
) {
  const supabase = await createClient();
  const { error } = await supabase.from("student_sessions").update(data).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}
