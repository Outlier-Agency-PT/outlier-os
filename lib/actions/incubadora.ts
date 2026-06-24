"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const moduleSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  order_index: z.number().int().min(0),
  is_active: z.boolean().default(true),
});

const lessonSchema = z.object({
  module_id: z.string().uuid(),
  title: z.string().min(1),
  content_url: z.string().url().nullable().optional().or(z.literal("")),
  order_index: z.number().int().min(0),
});

export type ModuleInput = z.infer<typeof moduleSchema>;
export type LessonInput = z.infer<typeof lessonSchema>;

// ── Módulos ──────────────────────────────────────────────────────────────────

export async function createModuleAction(input: ModuleInput) {
  const parsed = moduleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modules")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/incubadora");
  return { data };
}

export async function updateModuleAction(id: string, data: any) {
  const supabase = await createClient();
  const { title, description, order_index, is_active } = data;
  const { data: updated, error } = await supabase
    .from("modules")
    .update({ title, description, order_index, is_active })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath("/incubadora");
  return { data: updated };
}

export async function deleteModuleAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("modules").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/incubadora");
  return { success: true };
}

// ── Lições ───────────────────────────────────────────────────────────────────

export async function createLessonAction(input: LessonInput) {
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data_clean = { ...parsed.data };
  if (!data_clean.content_url) delete (data_clean as Record<string, unknown>).content_url;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .insert(data_clean)
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/incubadora");
  return { data };
}

export async function updateLessonAction(id: string, input: Partial<LessonInput>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath("/incubadora");
  return { data };
}

export async function deleteLessonAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/incubadora");
  return { success: true };
}

// ── Progresso do Aluno ────────────────────────────────────────────────────────

export async function completeLessonAction(lessonId: string, moduleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  // Insert lesson completion
  const { error: completionError } = await supabase
    .from("lesson_completions")
    .insert({
      student_id: user.id,
      lesson_id: lessonId,
    });

  if (completionError) return { error: completionError.message };

  // Check if all lessons in module are completed
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("module_id", moduleId);

  const { data: completions } = await supabase
    .from("lesson_completions")
    .select("lesson_id")
    .eq("student_id", user.id)
    .in("lesson_id", (lessons ?? []).map((l) => l.id));

  const allCompleted = (lessons ?? []).length > 0 &&
    (completions ?? []).length === (lessons ?? []).length;

  if (allCompleted) {
    // Upsert module completion
    await supabase.from("student_progress").upsert(
      {
        student_id: user.id,
        module_id: moduleId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "student_id,module_id" }
    );
  }

  revalidatePath("/incubadora");
  return { success: true };
}

export async function uncompleteLessonAction(lessonId: string, moduleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  // Delete lesson completion
  const { error: deleteError } = await supabase
    .from("lesson_completions")
    .delete()
    .eq("student_id", user.id)
    .eq("lesson_id", lessonId);

  if (deleteError) return { error: deleteError.message };

  // Mark module as incomplete
  await supabase
    .from("student_progress")
    .delete()
    .eq("student_id", user.id)
    .eq("module_id", moduleId);

  revalidatePath("/incubadora");
  return { success: true };
}

export async function requestEmergencyCallAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  // Check how many calls already exist
  const { data: existingCalls } = await supabase
    .from("emergency_calls")
    .select("id")
    .eq("student_id", user.id);

  if ((existingCalls ?? []).length >= 2) {
    return { error: "Já utilizou todas as chamadas de emergência" };
  }

  // Insert new emergency call
  const { error } = await supabase.from("emergency_calls").insert({
    student_id: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { success: true };
}

// ── Desafios ──────────────────────────────────────────────────────────────────

export async function completeChallengeAction(challengeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase.from("student_challenges").insert({
    student_id: user.id,
    challenge_id: challengeId,
  });

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { success: true };
}

export async function uncompleteChallengeAction(challengeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("student_challenges")
    .delete()
    .eq("student_id", user.id)
    .eq("challenge_id", challengeId);

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { success: true };
}

export async function saveChallengeNotesAction(challengeId: string, notes: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("student_challenges")
    .upsert(
      {
        student_id: user.id,
        challenge_id: challengeId,
        notes: notes || null,
      },
      { onConflict: "student_id,challenge_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { success: true };
}

export async function updateStudentProfileAction(data: {
  full_name?: string;
  nicho?: string;
  subnicho?: string;
  briefing?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("students")
    .update(data)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { success: true };
}

// ── Trilhas de Sucesso ────────────────────────────────────────────────────

export async function completeTrackStepAction(stepKey: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase.from("student_track_steps").insert({
    student_id: user.id,
    step_key: stepKey,
  });

  if (error && error.code !== "23505") return { error: error.message }; // 23505 = unique constraint

  revalidatePath("/incubadora");
  return { success: true };
}

export async function uncompleteTrackStepAction(stepKey: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("student_track_steps")
    .delete()
    .eq("student_id", user.id)
    .eq("step_key", stepKey);

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { success: true };
}
