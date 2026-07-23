"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  StudentLaunch,
  StudentLaunchAudience,
  LaunchNameIdea,
  NameIdeaType,
  NameIdeaStatus,
} from "@/lib/types/student-launches";
import type { ReviewStatus } from "@/lib/types/review-status";

function revalidate(studentId: string) {
  revalidatePath(`/incubadora/${studentId}`);
  revalidatePath("/incubadora");
}

// ── Audiências do lançamento ──────────────────────────────────────────────────

export async function getLaunchAudiencesAction(launchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_launch_audiences")
    .select("*")
    .eq("launch_id", launchId);
  return (data ?? []) as StudentLaunchAudience[];
}

export async function syncLaunchAudiencesAction(
  launchId: string,
  studentId: string,
  audiences: { profile_id: string; is_primary: boolean }[],
) {
  const supabase = await createClient();
  await supabase.from("student_launch_audiences").delete().eq("launch_id", launchId);
  if (audiences.length > 0) {
    const { error } = await supabase.from("student_launch_audiences").insert(
      audiences.map((a) => ({
        launch_id: launchId,
        audience_profile_id: a.profile_id,
        is_primary: a.is_primary,
      })),
    );
    if (error) return { error: error.message };
  }
  revalidate(studentId);
  return { success: true };
}

// ── Ideias de nome / promessa ─────────────────────────────────────────────────

export async function getLaunchNameIdeasAction(launchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_launch_name_ideas")
    .select("*")
    .eq("launch_id", launchId)
    .order("created_at", { ascending: true });
  return (data ?? []) as LaunchNameIdea[];
}

export async function createNameIdeaAction(
  launchId: string,
  studentId: string,
  type: NameIdeaType,
  content: string,
) {
  if (!content.trim()) return { error: "Conteúdo obrigatório" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_launch_name_ideas")
    .insert({ launch_id: launchId, type, content: content.trim() })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidate(studentId);
  return { data: data as LaunchNameIdea };
}

export async function updateNameIdeaStatusAction(
  id: string,
  launchId: string,
  studentId: string,
  status: NameIdeaStatus,
  notes: string | null,
) {
  const supabase = await createClient();

  // Regra: só 1 aprovado por tipo por lançamento
  if (status === "aprovado") {
    const { data: idea } = await supabase
      .from("student_launch_name_ideas")
      .select("type")
      .eq("id", id)
      .single();
    if (idea) {
      await supabase
        .from("student_launch_name_ideas")
        .update({ status: "rejeitado" })
        .eq("launch_id", launchId)
        .eq("type", (idea as { type: string }).type)
        .eq("status", "aprovado")
        .neq("id", id);
    }
  }

  const { error } = await supabase
    .from("student_launch_name_ideas")
    .update({ status, notes: notes ?? null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidate(studentId);
  return { success: true };
}

export async function deleteNameIdeaAction(id: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_launch_name_ideas")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidate(studentId);
  return { success: true };
}

// ── Criação / actualização via wizard ─────────────────────────────────────────

export interface WizardLaunchInput {
  title: string;
  launch_model: string | null;
  main_product_id: string | null;
  ticket: number | null;
  snapshot_at_creation: Record<string, unknown> | null;
  product_snapshot?: Record<string, unknown> | null;
  offer_overrides?: Record<string, unknown> | null;
  downsell_product_id: string | null;
  upsell_product_id: string | null;
  event_name: string | null;
  event_type: string | null;
  event_platform: string | null;
  event_time: string | null;
  big_idea: string | null;
  approved_promise: string | null;
  start_date: string | null;
  capture_start_date: string | null;
  launch_date: string | null;
  cart_open_date: string | null;
  cart_close_date: string | null;
  downsell_start_date: string | null;
  downsell_end_date: string | null;
  status: string;
  // Campos opcionais para seed de metas na criação
  budget_captacao?: number | null;
  lead_goal_1_paid?: number | null;
  conversion_rate_leads?: number | null;
  audiences: { profile_id: string; is_primary: boolean }[];
}

export async function createLaunchWithWizardAction(
  studentId: string,
  input: WizardLaunchInput,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { audiences, ...fields } = input;

  const { data, error } = await supabase
    .from("student_launches")
    .insert({ ...fields, student_id: studentId, created_by: user.id })
    .select()
    .single();
  if (error) return { error: error.message };

  const launch = data as StudentLaunch;

  if (audiences.length > 0) {
    await supabase.from("student_launch_audiences").insert(
      audiences.map((a) => ({
        launch_id: launch.id,
        audience_profile_id: a.profile_id,
        is_primary: a.is_primary,
      })),
    );
  }

  revalidate(studentId);
  return { data: launch };
}

export async function updateLaunchWithWizardAction(
  launchId: string,
  studentId: string,
  input: Partial<Omit<WizardLaunchInput, "audiences" | "snapshot_at_creation">>,
  audiences?: { profile_id: string; is_primary: boolean }[],
) {
  const supabase = await createClient();

  if (Object.keys(input).length > 0) {
    const { error } = await supabase
      .from("student_launches")
      .update(input)
      .eq("id", launchId);
    if (error) return { error: error.message };
  }

  if (audiences !== undefined) {
    await supabase.from("student_launch_audiences").delete().eq("launch_id", launchId);
    if (audiences.length > 0) {
      await supabase.from("student_launch_audiences").insert(
        audiences.map((a) => ({
          launch_id: launchId,
          audience_profile_id: a.profile_id,
          is_primary: a.is_primary,
        })),
      );
    }
  }

  revalidate(studentId);
  return { success: true };
}

// ── Duplicar lançamento ───────────────────────────────────────────────────────

export async function duplicateLaunchAction(launchId: string, studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: original, error: fetchErr } = await supabase
    .from("student_launches")
    .select("*")
    .eq("id", launchId)
    .single();
  if (fetchErr || !original) return { error: "Lançamento não encontrado" };

  const o = original as StudentLaunch;

  const { data: newLaunch, error: insertErr } = await supabase
    .from("student_launches")
    .insert({
      student_id:           studentId,
      title:                `Cópia de ${o.title}`,
      type:                 o.type,
      status:               "planeado",
      launch_model:         o.launch_model,
      main_product_id:      o.main_product_id,
      downsell_product_id:  o.downsell_product_id,
      upsell_product_id:    o.upsell_product_id,
      ticket:               o.ticket,
      event_name:           o.event_name,
      event_type:           o.event_type,
      event_platform:       o.event_platform,
      event_time:           o.event_time,
      big_idea:             o.big_idea,
      approved_promise:     o.approved_promise,
      promise:              o.promise,
      sub_promise:          o.sub_promise,
      goal:                 o.goal,
      notes:                o.notes,
      channels:             o.channels,
      // Datas: limpas — o novo lançamento precisa de novas datas
      // Orçamentos e metas: limpos — não copiar métricas
      // snapshot_at_creation: NÃO copiado — pertence ao contexto original
      created_by:           user.id,
    })
    .select()
    .single();
  if (insertErr) return { error: insertErr.message };

  const newId = (newLaunch as StudentLaunch).id;

  // Copia audiências (escolha estrutural)
  const { data: audiences } = await supabase
    .from("student_launch_audiences")
    .select("*")
    .eq("launch_id", launchId);
  if (audiences && audiences.length > 0) {
    await supabase.from("student_launch_audiences").insert(
      (audiences as StudentLaunchAudience[]).map((a) => ({
        launch_id:           newId,
        audience_profile_id: a.audience_profile_id,
        is_primary:          a.is_primary,
      })),
    );
  }

  // Copia ideias de nome/promessa com status 'sugestao'
  const { data: ideas } = await supabase
    .from("student_launch_name_ideas")
    .select("*")
    .eq("launch_id", launchId);
  if (ideas && ideas.length > 0) {
    await supabase.from("student_launch_name_ideas").insert(
      (ideas as LaunchNameIdea[]).map((i) => ({
        launch_id: newId,
        type:      i.type,
        content:   i.content,
        status:    "sugestao",
      })),
    );
  }

  revalidate(studentId);
  return { data: newLaunch as StudentLaunch };
}

// ── Revisão (coach) ───────────────────────────────────────────────────────────

export async function submitLaunchForReviewAction(launchId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_launches")
    .update({ review_status: "pronto_revisao" })
    .eq("id", launchId);
  if (error) return { error: error.message };

  const { data: launch } = await supabase
    .from("student_launches")
    .select("title")
    .eq("id", launchId)
    .single();

  const admin = createAdminClient();
  const { data: teamMembers } = await admin
    .from("team_members")
    .select("id")
    .eq("active", true);

  if (teamMembers && teamMembers.length > 0 && launch) {
    await admin.from("notifications").insert(
      (teamMembers as { id: string }[]).map((m) => ({
        user_id: m.id,
        type:    "launch_review_requested",
        title:   "Lançamento pronto para revisão",
        body:    `"${(launch as { title: string }).title}" foi submetido para revisão.`,
        link:    `/incubadora/${studentId}`,
      })),
    );
  }

  revalidate(studentId);
  return { success: true };
}

export async function updateLaunchReviewStatusAction(
  launchId: string,
  studentId: string,
  status: ReviewStatus,
  notes: string | null,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_launches")
    .update({ review_status: status, review_notes: notes ?? null })
    .eq("id", launchId);
  if (error) return { error: error.message };

  if (status === "alteracoes_pedidas" || status === "aprovado") {
    const { data: launch } = await supabase
      .from("student_launches")
      .select("student_id, title")
      .eq("id", launchId)
      .single();
    if (launch) {
      const { data: student } = await supabase
        .from("students")
        .select("user_id")
        .eq("id", (launch as { student_id: string }).student_id)
        .single();
      if (student) {
        const admin = createAdminClient();
        const l = launch as { student_id: string; title: string };
        await admin.from("notifications").insert({
          user_id: (student as { user_id: string }).user_id,
          type:    status === "aprovado" ? "launch_approved" : "launch_changes_requested",
          title:   status === "aprovado" ? "Lançamento aprovado" : "Revisão do lançamento",
          body:    status === "aprovado"
            ? `O lançamento "${l.title}" foi aprovado.`
            : `O coach pediu alterações no lançamento "${l.title}".`,
          link: "/incubadora",
        });
      }
    }
  }

  revalidate(studentId);
  return { success: true };
}

// ── Perfis de audiência (para selects do wizard) ──────────────────────────────

export async function getStudentAudienceProfilesForWizardAction(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_audience_profiles")
    .select("id, name, is_primary, is_archived")
    .eq("student_id", studentId)
    .eq("is_archived", false)
    .order("is_primary", { ascending: false });
  return (data ?? []) as { id: string; name: string; is_primary: boolean }[];
}

export async function getMyAudienceProfilesForWizardAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!student) return [];
  const { data } = await supabase
    .from("student_audience_profiles")
    .select("id, name, is_primary, is_archived")
    .eq("student_id", (student as { id: string }).id)
    .eq("is_archived", false)
    .order("is_primary", { ascending: false });
  return (data ?? []) as { id: string; name: string; is_primary: boolean }[];
}

// ── Student "My" actions — resolvem student_id via auth.uid() ─────────────────
// Usadas na vista do aluno para evitar passar user.id (auth UID) como studentId,
// que falha RLS porque student_launches.student_id = students.id (UUID diferente).

async function resolveMyStudentId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return student ? (student as { id: string }).id : null;
}

export async function createMyLaunchWithWizardAction(input: WizardLaunchInput) {
  const supabase = await createClient();
  const studentId = await resolveMyStudentId(supabase);
  if (!studentId) return { error: "Aluno não encontrado" };

  const { audiences, ...fields } = input;
  // created_by omitido: a FK aponta para team_members(id) e o aluno não é membro.
  // student_id já identifica o criador para lançamentos criados pelo próprio aluno.
  const { data, error } = await supabase
    .from("student_launches")
    .insert({ ...fields, student_id: studentId })
    .select()
    .single();
  if (error) return { error: error.message };

  const launch = data as StudentLaunch;
  if (audiences.length > 0) {
    await supabase.from("student_launch_audiences").insert(
      audiences.map((a) => ({
        launch_id: launch.id,
        audience_profile_id: a.profile_id,
        is_primary: a.is_primary,
      })),
    );
  }
  revalidate(studentId);
  return { data: launch };
}

export async function updateMyLaunchWithWizardAction(
  launchId: string,
  input: Partial<Omit<WizardLaunchInput, "audiences" | "snapshot_at_creation">>,
  audiences?: { profile_id: string; is_primary: boolean }[],
) {
  const supabase = await createClient();
  const studentId = await resolveMyStudentId(supabase);
  if (!studentId) return { error: "Aluno não encontrado" };

  if (Object.keys(input).length > 0) {
    const { error } = await supabase.from("student_launches").update(input).eq("id", launchId);
    if (error) return { error: error.message };
  }
  if (audiences !== undefined) {
    await supabase.from("student_launch_audiences").delete().eq("launch_id", launchId);
    if (audiences.length > 0) {
      await supabase.from("student_launch_audiences").insert(
        audiences.map((a) => ({
          launch_id: launchId,
          audience_profile_id: a.profile_id,
          is_primary: a.is_primary,
        })),
      );
    }
  }
  revalidate(studentId);
  return { success: true };
}

export async function duplicateMyLaunchAction(launchId: string) {
  const supabase = await createClient();
  const studentId = await resolveMyStudentId(supabase);
  if (!studentId) return { error: "Aluno não encontrado" };

  const { data: original, error: fetchErr } = await supabase
    .from("student_launches")
    .select("*")
    .eq("id", launchId)
    .single();
  if (fetchErr || !original) return { error: "Lançamento não encontrado" };

  const o = original as StudentLaunch;

  // created_by omitido: FK aponta para team_members(id); student_id já identifica o dono.
  const { data: newLaunch, error: insertErr } = await supabase
    .from("student_launches")
    .insert({
      student_id:           studentId,
      title:                `Cópia de ${o.title}`,
      type:                 o.type,
      status:               "planeado",
      launch_model:         o.launch_model,
      main_product_id:      o.main_product_id,
      downsell_product_id:  o.downsell_product_id,
      upsell_product_id:    o.upsell_product_id,
      ticket:               o.ticket,
      event_name:           o.event_name,
      event_type:           o.event_type,
      event_platform:       o.event_platform,
      event_time:           o.event_time,
      big_idea:             o.big_idea,
      approved_promise:     o.approved_promise,
      promise:              o.promise,
      sub_promise:          o.sub_promise,
      goal:                 o.goal,
      notes:                o.notes,
      channels:             o.channels,
    })
    .select()
    .single();
  if (insertErr) return { error: insertErr.message };

  const newId = (newLaunch as StudentLaunch).id;

  const { data: audiences } = await supabase
    .from("student_launch_audiences")
    .select("*")
    .eq("launch_id", launchId);
  if (audiences && audiences.length > 0) {
    await supabase.from("student_launch_audiences").insert(
      (audiences as StudentLaunchAudience[]).map((a) => ({
        launch_id:           newId,
        audience_profile_id: a.audience_profile_id,
        is_primary:          a.is_primary,
      })),
    );
  }

  const { data: ideas } = await supabase
    .from("student_launch_name_ideas")
    .select("*")
    .eq("launch_id", launchId);
  if (ideas && ideas.length > 0) {
    await supabase.from("student_launch_name_ideas").insert(
      (ideas as LaunchNameIdea[]).map((i) => ({
        launch_id: newId,
        type:      i.type,
        content:   i.content,
        status:    "sugestao",
      })),
    );
  }

  revalidate(studentId);
  return { data: newLaunch as StudentLaunch };
}

export async function submitMyLaunchForReviewAction(launchId: string) {
  const supabase = await createClient();
  const studentId = await resolveMyStudentId(supabase);
  if (!studentId) return { error: "Aluno não encontrado" };
  return submitLaunchForReviewAction(launchId, studentId);
}

export async function createMyNameIdeaAction(
  launchId: string,
  type: NameIdeaType,
  content: string,
) {
  const supabase = await createClient();
  const studentId = await resolveMyStudentId(supabase);
  if (!studentId) return { error: "Aluno não encontrado" };
  return createNameIdeaAction(launchId, studentId, type, content);
}

export async function updateMyNameIdeaStatusAction(
  id: string,
  launchId: string,
  status: NameIdeaStatus,
  notes: string | null,
) {
  const supabase = await createClient();
  const studentId = await resolveMyStudentId(supabase);
  if (!studentId) return { error: "Aluno não encontrado" };
  return updateNameIdeaStatusAction(id, launchId, studentId, status, notes);
}

export async function deleteMyNameIdeaAction(id: string) {
  const supabase = await createClient();
  const studentId = await resolveMyStudentId(supabase);
  if (!studentId) return { error: "Aluno não encontrado" };
  return deleteNameIdeaAction(id, studentId);
}
