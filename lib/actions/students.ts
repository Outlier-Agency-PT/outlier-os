"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

function generatePassword() {
  return Math.random().toString(36).slice(-10) + "A1!";
}

export async function createStudentAction(input: StudentInput) {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  let newUserId: string | null = null;
  let password: string | null = null;
  const cleanData = clean(parsed.data);

  // Se email foi fornecido, criar user em auth
  if (parsed.data.email && parsed.data.email.trim()) {
    const generatedPassword = generatePassword();
    const admin = createAdminClient();

    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.name },
    });

    if (createErr || !newUser.user) {
      return { error: { _form: [createErr?.message ?? "Erro a criar utilizador"] } };
    }

    newUserId = newUser.user.id;
    password = generatedPassword;

    // Inserir role 'aluno' em user_roles
    await supabase.from("user_roles").insert({
      user_id: newUserId,
      role: "aluno",
    });
  }

  // Criar student com user_id se foi criado auth user
  const studentData = { ...cleanData, created_by: user.id };
  if (newUserId) {
    (studentData as Record<string, any>).user_id = newUserId;
  }

  const { data, error } = await supabase
    .from("students")
    .insert(studentData)
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
  return { data: { student: data, password } };
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

export async function updateStudentLaunchAction(
  studentId: string,
  data: {
    launch_product?: string | null;
    launch_objective?: string | null;
    launch_date?: string | null;
    product_ticket?: string | null;
    leads_goal?: number | null;
    revenue_goal?: number | null;
    investment_budget?: number | null;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update(clean(data))
    .eq("id", studentId);
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}

export async function updateStudentFinancialAction(
  studentId: string,
  data: { revenue_generated?: number | null; debriefing?: string | null },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update(clean(data))
    .eq("id", studentId);
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}

export async function upsertStudentChecklistAction(
  studentId: string,
  data: {
    has_leads_goal?: boolean;
    has_organic_content?: boolean;
    has_bio_link?: boolean;
    notes?: string | null;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase.from("student_checklist").upsert(
    { student_id: studentId, ...clean(data) },
    { onConflict: "student_id" },
  );
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}

export async function createStudentNoteAction(
  studentId: string,
  data: {
    contact_type: "Call" | "WhatsApp" | "Email" | "Sessão quinzenal" | "Outro";
    involvement: string;
    motivation: string;
    content: string;
    reminder_date?: string | null;
  },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase.from("student_notes").insert({
    student_id: studentId,
    author_id: user.id,
    contact_type: data.contact_type,
    involvement: data.involvement,
    motivation: data.motivation,
    content: data.content,
    reminder_date: data.reminder_date || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}

export async function updateStudentNoteAction(
  noteId: string,
  studentId: string,
  data: {
    contact_type?: string;
    involvement?: string;
    motivation?: string;
    content?: string;
    reminder_date?: string | null;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_notes")
    .update(data)
    .eq("id", noteId);
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}

export async function deleteStudentNoteAction(noteId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_notes")
    .delete()
    .eq("id", noteId);
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}

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
