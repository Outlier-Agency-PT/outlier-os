"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  StudentLaunch,
  StudentLaunchDebrief,
  StudentProduct,
} from "@/lib/types/student-launches";

function revalidateLaunch(studentId: string) {
  revalidatePath(`/incubadora/${studentId}`);
  revalidatePath("/incubadora");
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function getStudentProductsAction(studentId: string) {
  const { getStudentProducts } = await import("@/lib/queries/student-launches");
  return getStudentProducts(studentId);
}

export async function createStudentProductAction(
  studentId: string,
  input: Omit<StudentProduct, "id" | "student_id" | "created_at" | "updated_at">,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data, error } = await supabase
    .from("student_products")
    .insert({ ...input, student_id: studentId })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidateLaunch(studentId);
  return { data: data as StudentProduct };
}

export async function updateStudentProductAction(
  productId: string,
  studentId: string,
  input: Partial<Omit<StudentProduct, "id" | "student_id" | "created_at" | "updated_at">>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_products")
    .update(input)
    .eq("id", productId)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidateLaunch(studentId);
  return { data: data as StudentProduct };
}

export async function deleteStudentProductAction(productId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_products")
    .delete()
    .eq("id", productId);
  if (error) return { error: error.message };
  revalidateLaunch(studentId);
  return { success: true };
}

// ── Launches ─────────────────────────────────────────────────────────────────

// Aluno vê os seus próprios lançamentos (RLS filtra por user_id)
export async function getStudentOwnLaunchesAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("student_launches")
    .select("*")
    .order("launch_date", { ascending: false, nullsFirst: false });
  return (data ?? []) as import("@/lib/queries/student-launches").StudentLaunch[];
}

export async function getStudentLaunchesAction(studentId: string) {
  const { getStudentLaunches } = await import("@/lib/queries/student-launches");
  return getStudentLaunches(studentId);
}

export async function createStudentLaunchAction(
  studentId: string,
  input: Partial<
    Omit<StudentLaunch, "id" | "student_id" | "created_by" | "revenue_synced" | "deletion_requested_at" | "deletion_requested_by" | "created_at" | "updated_at">
  > & { title: string },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data, error } = await supabase
    .from("student_launches")
    .insert({
      ...input,
      student_id: studentId,
      created_by: user.id,
      status: input.status ?? "planeado",
    })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidateLaunch(studentId);
  return { data: data as StudentLaunch };
}

export async function updateStudentLaunchAction(
  launchId: string,
  studentId: string,
  input: Partial<
    Omit<StudentLaunch, "id" | "student_id" | "created_by" | "revenue_synced" | "deletion_requested_at" | "deletion_requested_by" | "created_at" | "updated_at">
  >,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_launches")
    .update(input)
    .eq("id", launchId)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidateLaunch(studentId);
  return { data: data as StudentLaunch };
}

// Aluno pede exclusão — NÃO apaga, cria pedido e notifica equipa
export async function requestLaunchDeletionAction(launchId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // Marca pedido no lançamento
  const { data: launch, error: fetchErr } = await supabase
    .from("student_launches")
    .select("id, title, student_id")
    .eq("id", launchId)
    .maybeSingle();
  if (fetchErr || !launch) return { error: "Lançamento não encontrado" };

  const { error: updateErr } = await supabase
    .from("student_launches")
    .update({ deletion_requested_at: new Date().toISOString(), deletion_requested_by: user.id })
    .eq("id", launchId);
  if (updateErr) return { error: updateErr.message };

  // Notifica todos os membros da equipa (usando admin para contornar RLS de insert)
  const admin = createAdminClient();
  const { data: teamMembers } = await admin
    .from("team_members")
    .select("user_id")
    .not("user_id", "is", null);

  const l = launch as { id: string; title: string; student_id: string };

  if (teamMembers && teamMembers.length > 0) {
    await admin.from("notifications").insert(
      (teamMembers as { user_id: string }[]).map((m) => ({
        user_id: m.user_id,
        type: "launch_deletion_requested",
        title: "Pedido de exclusão de lançamento",
        body: `O aluno solicitou a exclusão do lançamento "${l.title}".`,
        link: `/incubadora/${l.student_id}`,
      })),
    );
  }

  revalidateLaunch(l.student_id);
  return { success: true };
}

// Coach/admin apaga directamente
export async function deleteLaunchAction(launchId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_launches")
    .delete()
    .eq("id", launchId);
  if (error) return { error: error.message };
  revalidateLaunch(studentId);
  return { success: true };
}

// Coach/admin cancela pedido de exclusão sem apagar
export async function cancelLaunchDeletionRequestAction(launchId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_launches")
    .update({ deletion_requested_at: null, deletion_requested_by: null })
    .eq("id", launchId);
  if (error) return { error: error.message };
  revalidateLaunch(studentId);
  return { success: true };
}

// ── Debriefs ─────────────────────────────────────────────────────────────────

export async function getLaunchDebriefAction(launchId: string) {
  const { getLaunchDebrief } = await import("@/lib/queries/student-launches");
  return getLaunchDebrief(launchId);
}

export async function upsertLaunchDebriefAction(
  launchId: string,
  studentId: string,
  input: Partial<
    Omit<StudentLaunchDebrief, "id" | "launch_id" | "revenue_synced" | "created_at" | "updated_at">
  >,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_launch_debriefs")
    .upsert(
      { ...input, launch_id: launchId },
      { onConflict: "launch_id" },
    )
    .select()
    .single();
  if (error) return { error: error.message };
  revalidateLaunch(studentId);
  return { data: data as StudentLaunchDebrief };
}
