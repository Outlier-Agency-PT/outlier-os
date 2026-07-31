"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import type { ReviewStatus } from "@/lib/types/review-status";
import type { StudentDiaryEntry } from "@/lib/types";

const studentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  nicho: z.string().nullable().optional(),
  subnicho: z.string().nullable().optional(),
  coach_id: z.string().uuid().nullable().optional(),
  level: z.enum(["aprendiz", "fazedor", "referencia", "suspenso"]).default("aprendiz"),
  turma: z.string().nullable().optional(),
  entry_type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  briefing: z.string().nullable().optional(),
  mindmap_url: z.string().url().nullable().optional().or(z.literal("")),
  motivation: z.string().nullable().optional(),
  priority: z.enum(["alta", "media", "baixa"]).nullable().optional(),
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

    await supabase.from("user_roles").insert({
      user_id: newUserId,
      role: "aluno",
    });
  }

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
    // Setup inicial
    has_strategy_session?: boolean;
    has_business_briefing?: boolean;
    has_mindmap?: boolean;
    // Presença digital
    has_bio_link?: boolean;
    has_organic_content?: boolean;
    has_instagram?: boolean;
    // Lançamento
    has_launch_briefing?: boolean;
    has_capture_page?: boolean;
    has_leads_goal?: boolean;
    has_ads_campaign?: boolean;
    has_launch?: boolean;
    has_debrief?: boolean;
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
    reminder_note?: string | null;
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
    reminder_note: data.reminder_note || null,
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
    reminder_note?: string | null;
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

// ── Briefing actions ─────────────────────────────────────────────────────────

type BriefingStep = "negocio" | "produto" | "objecoes" | "estrategia";

async function resolveStudentId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string },
  explicitStudentId?: string,
): Promise<string | null> {
  if (explicitStudentId) return explicitStudentId;
  const { data } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function getStudentBriefingAction(studentId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const resolvedId = await resolveStudentId(supabase, user, studentId);
  if (!resolvedId) return null;

  const { data } = await supabase
    .from("student_briefings")
    .select("*")
    .eq("student_id", resolvedId)
    .maybeSingle();
  return data ?? null;
}

export async function saveStudentBriefingAction(
  step: BriefingStep,
  data: Record<string, unknown>,
  studentId?: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const resolvedId = await resolveStudentId(supabase, user, studentId);
  if (!resolvedId) return { error: "Perfil de aluno não encontrado" };

  const { error } = await supabase
    .from("student_briefings")
    .upsert(
      { student_id: resolvedId, [step]: data },
      { onConflict: "student_id" },
    );
  if (error) return { error: error.message };

  // Quando o aluno grava o módulo Negócio pela primeira vez, avança o estado de revisão
  // de nao_iniciado para em_preenchimento (nunca sobrepõe estados mais avançados).
  if (step === "negocio") {
    const { data: current } = await supabase
      .from("student_briefings")
      .select("review_status")
      .eq("student_id", resolvedId)
      .maybeSingle();

    if ((current as { review_status?: string } | null)?.review_status === "nao_iniciado") {
      await supabase
        .from("student_briefings")
        .update({ review_status: "em_preenchimento" })
        .eq("student_id", resolvedId);
    }
  }

  // Actualiza is_complete — verifica campos obrigatórios do passo Negócio
  const { data: row } = await supabase
    .from("student_briefings")
    .select("negocio")
    .eq("student_id", resolvedId)
    .maybeSingle();

  const n = (row?.negocio as Record<string, unknown> | null) ?? {};

  const negocioComplete = !!(
    n.nome_negocio &&
    n.nicho &&
    n.publico_alvo &&
    n.proposta_valor &&
    n.transformacao_entregue
  );
  const isComplete = !!negocioComplete;

  await supabase
    .from("student_briefings")
    .update({ is_complete: isComplete })
    .eq("student_id", resolvedId);

  revalidatePath(`/incubadora`);
  return { success: true };
}

/**
 * Aluno submete o módulo Negócio para revisão do coach.
 * Muda review_status para 'pronto_revisao' e notifica todos os membros da equipa.
 */
export async function submitBriefingForReviewAction(studentId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const resolvedId = await resolveStudentId(supabase, user, studentId);
  if (!resolvedId) return { error: "Perfil de aluno não encontrado" };

  const { error } = await supabase
    .from("student_briefings")
    .update({ review_status: "pronto_revisao" })
    .eq("student_id", resolvedId);
  if (error) return { error: error.message };

  // Notifica todos os membros da equipa (admin + membros)
  const admin = createAdminClient();
  const [{ data: studentRow }, { data: teamMembers }] = await Promise.all([
    admin.from("students").select("id, name").eq("id", resolvedId).maybeSingle(),
    admin.from("team_members").select("user_id").not("user_id", "is", null),
  ]);

  const s = studentRow as { id: string; name: string } | null;

  if (s && teamMembers && teamMembers.length > 0) {
    await admin.from("notifications").insert(
      (teamMembers as { user_id: string }[]).map((m) => ({
        user_id: m.user_id,
        type: "briefing_review_requested",
        title: "Módulo Negócio pronto para revisão",
        body: `${s.name} submeteu o módulo Negócio para revisão do coach.`,
        link: `/incubadora/${resolvedId}`,
      })),
    );
  }

  revalidatePath(`/incubadora`);
  if (resolvedId) revalidatePath(`/incubadora/${resolvedId}`);
  return { success: true };
}

/**
 * Coach aprova ou pede alterações no módulo Negócio de um aluno.
 * Usa as COACH_TRANSITIONS de lib/types/review-status.ts.
 */
export async function updateBriefingReviewStatusAction(
  studentId: string,
  status: ReviewStatus,
  notes?: string,
) {
  const supabase = await createClient();
  const updates: Record<string, unknown> = { review_status: status };
  if (notes !== undefined) updates.review_notes = notes || null;

  const { error } = await supabase
    .from("student_briefings")
    .update(updates)
    .eq("student_id", studentId);
  if (error) return { error: error.message };

  // Notifica o aluno quando o coach aprova ou pede alterações
  if (status === "aprovado" || status === "alteracoes_pedidas") {
    const admin = createAdminClient();
    const { data: student } = await admin
      .from("students")
      .select("user_id")
      .eq("id", studentId)
      .maybeSingle();

    const uid = (student as { user_id: string | null } | null)?.user_id;
    if (uid) {
      await admin.from("notifications").insert({
        user_id: uid,
        type: "briefing_reviewed",
        title:
          status === "aprovado"
            ? "Módulo Negócio aprovado!"
            : "Alterações pedidas no Módulo Negócio",
        body:
          status === "aprovado"
            ? "O teu coach aprovou o módulo Negócio."
            : notes
              ? `O teu coach pediu alterações: ${notes.slice(0, 120)}`
              : "O teu coach pediu alterações no módulo Negócio.",
        link: "/incubadora",
      });
    }
  }

  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}

const renewalSchema = z.object({
  renewal_status: z.enum(["pendente", "renovado", "nao_renovado", "bonus"]).optional(),
  renewal_date: z.string().nullable().optional().transform((v) => (v === "" ? null : v)),
  renewal_notes: z.string().nullable().optional().transform((v) => (v === "" ? null : v)),
});

// ── ROI / Revenue History actions ────────────────────────────────────────────

export async function getStudentSelfFinancialAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("students")
    .select("id, revenue_generated, revenue_goal, investment_budget, start_date, debriefing")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data ?? null) as {
    id: string;
    revenue_generated: number | null;
    revenue_goal: number | null;
    investment_budget: number | null;
    start_date: string | null;
    debriefing: string | null;
  } | null;
}

export async function updateStudentSelfRevenueAction(
  revenue: number | null,
  debriefing: string | null,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!student) return { error: "Perfil de aluno não encontrado" };

  const s = student as { id: string };

  const { error } = await admin
    .from("students")
    .update({ revenue_generated: revenue, debriefing })
    .eq("id", s.id);

  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { success: true };
}

export async function getStudentRevenueHistoryAction(studentId: string) {
  const { getStudentRevenueHistory } = await import("@/lib/queries/students");
  return getStudentRevenueHistory(studentId);
}

export async function getStudentsROISummaryAction() {
  const { getStudentsROISummary } = await import("@/lib/queries/students");
  return getStudentsROISummary();
}

export async function updateRenewalAction(
  studentId: string,
  data: {
    renewal_status?: "pendente" | "renovado" | "nao_renovado" | "bonus";
    renewal_date?: string | null;
    renewal_notes?: string | null;
  },
) {
  const parsed = renewalSchema.safeParse(data);
  if (!parsed.success) return { error: "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update(parsed.data)
    .eq("id", studentId);
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  revalidatePath("/incubadora");
  return { success: true };
}

export async function getIncubadoraStatsAction() {
  const { getIncubadoraStats } = await import("@/lib/queries/students");
  return getIncubadoraStats();
}

// ── Página de Vendas ─────────────────────────────────────────────────────────

function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function updateStudentSalesPageAction(salesPageUrl: string) {
  if (!validateUrl(salesPageUrl)) return { error: "URL inválido" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("students")
    .select("id, sales_page_published_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!student) return { error: "Perfil de aluno não encontrado" };

  const s = student as { id: string; sales_page_published_at: string | null };
  const updates: Record<string, unknown> = { sales_page_url: salesPageUrl };
  if (!s.sales_page_published_at) {
    updates.sales_page_published_at = new Date().toISOString();
  }

  const { error } = await admin.from("students").update(updates).eq("id", s.id);
  if (error) return { error: error.message };

  revalidatePath("/incubadora");
  return { success: true };
}

export async function getStudentSalesPageAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("students")
    .select("sales_page_url, sales_page_published_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return (data ?? null) as { sales_page_url: string | null; sales_page_published_at: string | null } | null;
}

export async function updateStudentSalesPageByIdAction(studentId: string, salesPageUrl: string | null) {
  if (salesPageUrl && !validateUrl(salesPageUrl)) return { error: "URL inválido" };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("students")
    .select("sales_page_published_at")
    .eq("id", studentId)
    .maybeSingle();

  const e = existing as { sales_page_published_at: string | null } | null;
  const updates: Record<string, unknown> = { sales_page_url: salesPageUrl || null };
  if (salesPageUrl && !e?.sales_page_published_at) {
    updates.sales_page_published_at = new Date().toISOString();
  }

  const { error } = await admin.from("students").update(updates).eq("id", studentId);
  if (error) return { error: error.message };

  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}

// ── Diário de Bordo ──────────────────────────────────────────────────────────

export async function createDiaryEntryAction(studentId: string, content: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_diary")
    .insert({ student_id: studentId, content: content.trim() })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { data: data as StudentDiaryEntry };
}

export async function updateDiaryEntryAction(entryId: string, studentId: string, content: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_diary")
    .update({ content: content.trim() })
    .eq("id", entryId)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { data: data as StudentDiaryEntry };
}

export async function deleteDiaryEntryAction(entryId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_diary")
    .delete()
    .eq("id", entryId);
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}
