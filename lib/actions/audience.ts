"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStudentAudienceProfiles,
  getStudentAudienceProfile,
} from "@/lib/queries/audience";
import type { AudienceProfile } from "@/lib/queries/audience";
import type { ReviewStatus } from "@/lib/types/review-status";
import { COACH_TRANSITIONS } from "@/lib/types/review-status";

// ── Tipo de dados do formulário ───────────────────────────────────────────────

export type AudienceProfileData = Omit<
  AudienceProfile,
  "id" | "student_id" | "is_primary" | "is_archived" | "review_status" | "review_notes" | "created_at" | "updated_at"
>;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveOwnStudentId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function assertProfileOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  userId: string,
): Promise<{ profile: AudienceProfile } | { error: string }> {
  const { data: profile } = await supabase
    .from("student_audience_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { error: "Perfil não encontrado" };

  // RLS garante acesso, mas verificamos explicitamente para mensagens de erro claras
  const studentId = await resolveOwnStudentId(supabase, userId);
  const isOwner = (profile as AudienceProfile).student_id === studentId;
  if (!isOwner) return { error: "Sem permissão" };

  return { profile: profile as AudienceProfile };
}

// ── Read actions ──────────────────────────────────────────────────────────────

/** Para o aluno ver os seus próprios perfis (RLS filtra automaticamente). */
export async function getMyAudienceProfilesAction(): Promise<AudienceProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_audience_profiles")
    .select("*")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  return (data ?? []) as AudienceProfile[];
}

/** Para o coach ver os perfis de um aluno específico. */
export async function getStudentAudienceProfilesAction(
  studentId: string,
): Promise<AudienceProfile[]> {
  return getStudentAudienceProfiles(studentId);
}

export async function getAudienceProfileAction(
  id: string,
): Promise<AudienceProfile | null> {
  return getStudentAudienceProfile(id);
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createAudienceProfileAction(name: string) {
  if (!name.trim()) return { error: "O nome do perfil é obrigatório" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const studentId = await resolveOwnStudentId(supabase, user.id);
  if (!studentId) return { error: "Perfil de aluno não encontrado" };

  // Verifica se já existe algum perfil (se não, este será o primário)
  const { count } = await supabase
    .from("student_audience_profiles")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("is_archived", false);

  const isPrimary = (count ?? 0) === 0;

  const { data, error } = await supabase
    .from("student_audience_profiles")
    .insert({ student_id: studentId, name: name.trim(), is_primary: isPrimary })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { data: data as { id: string } };
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateAudienceProfileAction(
  id: string,
  patch: Partial<AudienceProfileData> & { name?: string },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // Verifica o estado actual para decidir se avança para em_preenchimento
  const { data: current } = await supabase
    .from("student_audience_profiles")
    .select("review_status")
    .eq("id", id)
    .maybeSingle();

  const updates: Record<string, unknown> = { ...patch };

  // Na primeira edição, avança o estado para em_preenchimento
  if ((current as { review_status?: string } | null)?.review_status === "nao_iniciado") {
    updates.review_status = "em_preenchimento";
  }

  const { error } = await supabase
    .from("student_audience_profiles")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { success: true };
}

// ── Set primary ───────────────────────────────────────────────────────────────

export async function setPrimaryAudienceProfileAction(
  id: string,
  studentId: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // Usa admin para poder actualizar múltiplas linhas sem conflito com o índice único
  // (retira is_primary dos outros antes de marcar o novo)
  const admin = createAdminClient();

  const { error: clearError } = await admin
    .from("student_audience_profiles")
    .update({ is_primary: false })
    .eq("student_id", studentId)
    .eq("is_primary", true);

  if (clearError) return { error: clearError.message };

  const { error } = await admin
    .from("student_audience_profiles")
    .update({ is_primary: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { success: true };
}

// ── Archive ───────────────────────────────────────────────────────────────────

export async function archiveAudienceProfileAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("student_audience_profiles")
    .update({ is_archived: true, is_primary: false })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { success: true };
}

// ── Duplicate ─────────────────────────────────────────────────────────────────

export async function duplicateAudienceProfileAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const check = await assertProfileOwner(supabase, id, user.id);
  if ("error" in check) return check;

  const { profile } = check;
  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    is_primary: _ip,
    review_status: _rs,
    review_notes: _rn,
    ...rest
  } = profile;

  const { data, error } = await supabase
    .from("student_audience_profiles")
    .insert({
      ...rest,
      name: `Cópia de ${profile.name}`,
      is_primary: false,
      review_status: "nao_iniciado",
      review_notes: null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { data: data as { id: string } };
}

// ── Submit for review ─────────────────────────────────────────────────────────

export async function submitAudienceForReviewAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("student_audience_profiles")
    .update({ review_status: "pronto_revisao" })
    .eq("id", id);

  if (error) return { error: error.message };

  // Notifica a equipa
  const admin = createAdminClient();
  const [{ data: profile }, { data: teamMembers }] = await Promise.all([
    admin
      .from("student_audience_profiles")
      .select("name, student_id")
      .eq("id", id)
      .maybeSingle(),
    admin.from("team_members").select("id").eq("active", true),
  ]);

  const p = profile as { name: string; student_id: string } | null;

  if (p && teamMembers && teamMembers.length > 0) {
    // Busca o nome do aluno
    const { data: studentRow } = await admin
      .from("students")
      .select("name")
      .eq("id", p.student_id)
      .maybeSingle();
    const studentName = (studentRow as { name: string } | null)?.name ?? "Aluno";

    await admin.from("notifications").insert(
      (teamMembers as { id: string }[]).map((m) => ({
        user_id: m.id,
        type: "audience_review_requested",
        title: "Perfil de audiência pronto para revisão",
        body: `${studentName}: perfil "${p.name}" submetido para revisão.`,
        link: `/incubadora/${p.student_id}`,
      })),
    );
  }

  revalidatePath("/incubadora");
  return { success: true };
}

// ── Coach: update review status ───────────────────────────────────────────────

export async function updateAudienceReviewStatusAction(
  id: string,
  status: ReviewStatus,
  notes?: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // Verifica que o coach pertence à equipa
  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!member) return { error: "Sem permissão" };

  // Valida a transição
  const { data: current } = await supabase
    .from("student_audience_profiles")
    .select("review_status, student_id, name")
    .eq("id", id)
    .maybeSingle();

  if (!current) return { error: "Perfil não encontrado" };

  const currentStatus = (current as { review_status: string }).review_status as ReviewStatus;
  const allowed = COACH_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(status)) {
    return { error: `Transição de "${currentStatus}" para "${status}" não permitida` };
  }

  const updates: Record<string, unknown> = { review_status: status };
  if (notes !== undefined) updates.review_notes = notes || null;

  const { error } = await supabase
    .from("student_audience_profiles")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  // Notifica o aluno quando o coach aprova ou pede alterações
  if (status === "aprovado" || status === "alteracoes_pedidas") {
    const admin = createAdminClient();
    const c = current as { student_id: string; name: string; review_status: string };

    const { data: studentRow } = await admin
      .from("students")
      .select("user_id")
      .eq("id", c.student_id)
      .maybeSingle();

    const studentUserId = (studentRow as { user_id: string } | null)?.user_id;
    if (studentUserId) {
      await admin.from("notifications").insert({
        user_id: studentUserId,
        type: status === "aprovado" ? "audience_approved" : "audience_changes_requested",
        title:
          status === "aprovado"
            ? "Perfil de audiência aprovado"
            : "Alterações pedidas ao teu perfil",
        body:
          status === "aprovado"
            ? `O teu perfil "${c.name}" foi aprovado pelo coach.`
            : `O coach pediu alterações ao perfil "${c.name}". Verifica as notas.`,
        link: "/incubadora",
      });
    }
  }

  revalidatePath("/incubadora");
  const { student_id } = current as { student_id: string };
  if (student_id) revalidatePath(`/incubadora/${student_id}`);

  return { success: true };
}
