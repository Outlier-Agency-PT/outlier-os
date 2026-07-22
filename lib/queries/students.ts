import { createClient } from "@/lib/supabase/server";
import type { ReviewStatus } from "@/lib/types/review-status";

export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  nicho: string | null;
  subnicho: string | null;
  coach_id: string | null;
  level: "aprendiz" | "fazedor" | "referencia" | "suspenso";
  turma: string | null;
  entry_type: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  briefing: string | null;
  mindmap_url: string | null;
  user_id: string | null;
  launch_product: string | null;
  launch_objective: string | null;
  launch_date: string | null;
  product_ticket: string | null;
  leads_goal: number | null;
  revenue_goal: number | null;
  investment_budget: number | null;
  revenue_generated: number | null;
  debriefing: string | null;
  renewal_status: "pendente" | "renovado" | "nao_renovado" | "bonus";
  renewal_date: string | null;
  renewal_notes: string | null;
  renewal_decided_at: string | null;
  sales_page_url: string | null;
  sales_page_published_at: string | null;
  motivation: string | null;
  priority: "alta" | "media" | "baixa" | null;
  created_at: string;
  coach: { id: string; full_name: string } | null;
}

// ── Briefing types ──────────────────────────────────────────────────────────

export interface BriefingNegocio {
  // Dados Gerais (campos originais)
  nome_negocio?: string;
  nicho?: string;
  proposta_valor?: string;
  diferencial?: string;
  historia?: string;
  resultados_passados?: string;
  // Posicionamento (novos)
  missao?: string;
  visao?: string;
  // Público e Transformação (novos)
  publico_alvo?: string;
  dores_resolvidas?: string[];
  transformacao_entregue?: string;
  // Objetivos e Valores (novos)
  objetivos?: { descricao: string; prioridade: "alta" | "media" | "baixa" }[];
  valores?: { palavra: string; explicacao?: string }[];
  // SWOT (novo)
  swot?: {
    forcas: string[];
    fraquezas: string[];
    oportunidades: string[];
    ameacas: string[];
  };
  // Concorrentes e Referências (novos)
  concorrentes?: { nome: string; url?: string; observacoes?: string }[];
  referencias?: { nome: string; url?: string; porque: string }[];
}

export interface BriefingProduto {
  nome_produto?: string;
  preco?: number | null;
  tipo_produto?: string;
  descricao?: string;
  beneficios?: string[];
  garantia?: string;
  bonus?: string[];
  lead_magnet?: string;
  produto_entrada?: string;
  produto_principal?: string;
  produto_premium?: string;
  high_ticket?: string;
}

export interface BriefingAudiencia {
  avatar?: string;
  faixa_etaria?: string;
  genero?: string;
  dores?: string[];
  desejos?: string[];
  objecoes_audiencia?: string[];
}

export interface BriefingObjecao {
  objecao: string;
  resposta: string;
}

export interface BriefingEstrategia {
  tipo_lancamento?: string;
  canais?: string[];
  frequencia?: string;
  meta_faturamento?: number | null;
  meta_leads?: number | null;
}

export interface StudentBriefing {
  id: string;
  student_id: string;
  negocio: BriefingNegocio;
  produto: BriefingProduto;
  audiencia: BriefingAudiencia;
  objecoes: BriefingObjecao[];
  estrategia: BriefingEstrategia;
  is_complete: boolean;
  review_status: ReviewStatus;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── RenewalAlert ─────────────────────────────────────────────────────────────

export interface RenewalAlert {
  id: string;
  name: string;
  coach: { full_name: string } | null;
  renewal_date: string;
  renewal_status: string;
  renewal_notes: string | null;
  dias_restantes: number;
}

export interface StudentChecklist {
  id: string;
  student_id: string;
  has_leads_goal: boolean;
  has_organic_content: boolean;
  has_bio_link: boolean;
  notes: string | null;
}

export interface StudentNote {
  id: string;
  student_id: string;
  author_id: string;
  contact_type: "Call" | "WhatsApp" | "Email" | "Sessão quinzenal" | "Outro";
  involvement: string;
  motivation: string;
  content: string;
  reminder_date: string | null;
  reminder_note: string | null;
  created_at: string;
  author: { full_name: string };
}

export interface PendingReminder {
  id: string;
  student_id: string;
  student_name: string;
  contact_type: string;
  content: string;
  reminder_date: string;
  reminder_note: string | null;
  urgency: "vencido" | "hoje" | "esta-semana";
}

export interface SessionType {
  id: string;
  key: string;
  label: string;
  sort_order: number;
}

export interface StudentSession {
  id: string;
  student_id: string;
  type_id: string;
  scheduled_date: string | null;
  completed_at: string | null;
  notes: string | null;
  type: { key: string; label: string };
}

export async function getStudents(): Promise<Student[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select(`*, coach:team_members!students_coach_id_fkey(id, full_name)`)
    .order("created_at", { ascending: false });
  return (data ?? []) as Student[];
}

export async function getStudentById(id: string): Promise<{
  student: Student | null;
  sessions: StudentSession[];
  checklist: StudentChecklist | null;
  notes: StudentNote[];
}> {
  const supabase = await createClient();
  const [{ data: student }, { data: sessions }, { data: checklist }, { data: notes }] = await Promise.all([
    supabase
      .from("students")
      .select(`*, coach:team_members!students_coach_id_fkey(id, full_name)`)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("student_sessions")
      .select(`*, type:student_session_types(key, label)`)
      .eq("student_id", id)
      .order("type"),
    supabase
      .from("student_checklist")
      .select("*")
      .eq("student_id", id)
      .maybeSingle(),
    supabase
      .from("student_notes")
      .select(`*, author:team_members!student_notes_author_id_fkey(full_name)`)
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
  ]);
  return {
    student: (student ?? null) as Student | null,
    sessions: (sessions ?? []) as StudentSession[],
    checklist: (checklist ?? null) as StudentChecklist | null,
    notes: (notes ?? []) as StudentNote[],
  };
}

export async function getStudentChecklist(studentId: string): Promise<StudentChecklist | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_checklist")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data ?? null) as StudentChecklist | null;
}

export async function getStudentNotes(studentId: string): Promise<StudentNote[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_notes")
    .select(`*, author:team_members!student_notes_author_id_fkey(full_name)`)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return (data ?? []) as StudentNote[];
}

export async function getSessionTypes(): Promise<SessionType[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_session_types")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as SessionType[];
}

export async function getStudentBriefing(studentId: string): Promise<StudentBriefing | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_briefings")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data ?? null) as StudentBriefing | null;
}

export async function getStudentsWithRenewalAlerts(): Promise<RenewalAlert[]> {
  const supabase = await createClient();

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

  const { data } = await supabase
    .from("students")
    .select(`id, name, renewal_date, renewal_status, renewal_notes, coach:team_members!students_coach_id_fkey(full_name)`)
    .eq("status", "ativo")
    .eq("renewal_status", "pendente")
    .not("renewal_date", "is", null)
    .lte("renewal_date", thirtyDaysStr)
    .order("renewal_date", { ascending: true });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (data ?? []).map((s: any) => {
    const [y, m, d] = (s.renewal_date as string).split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const dias_restantes = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: s.id,
      name: s.name,
      coach: s.coach,
      renewal_date: s.renewal_date,
      renewal_status: s.renewal_status,
      renewal_notes: s.renewal_notes,
      dias_restantes,
    };
  });
}

// ── Revenue History ──────────────────────────────────────────────────────────

export interface StudentRevenueEntry {
  id: string;
  value: number;
  recorded_at: string;
  note: string | null;
}

export interface StudentROISummary {
  id: string;
  name: string;
  revenue_generated: number | null;
  investment_budget: number | null;
  revenue_goal: number | null;
  start_date: string | null;
  roi: number | null;
  last_updated: string | null;
}

export async function getStudentRevenueHistory(studentId: string): Promise<StudentRevenueEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_revenue_history")
    .select("id, value, recorded_at, note")
    .eq("student_id", studentId)
    .order("recorded_at", { ascending: true });
  return (data ?? []) as StudentRevenueEntry[];
}

export async function getStudentsROISummary(): Promise<StudentROISummary[]> {
  const supabase = await createClient();
  const [{ data: students }, { data: history }] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, revenue_generated, investment_budget, revenue_goal, start_date")
      .eq("status", "ativo"),
    supabase
      .from("student_revenue_history")
      .select("student_id, recorded_at")
      .order("recorded_at", { ascending: false }),
  ]);

  const lastUpdatedMap = new Map<string, string>();
  for (const entry of (history ?? []) as { student_id: string; recorded_at: string }[]) {
    if (!lastUpdatedMap.has(entry.student_id)) {
      lastUpdatedMap.set(entry.student_id, entry.recorded_at);
    }
  }

  const result: StudentROISummary[] = (
    (students ?? []) as {
      id: string;
      name: string;
      revenue_generated: number | null;
      investment_budget: number | null;
      revenue_goal: number | null;
      start_date: string | null;
    }[]
  ).map((s) => ({
    ...s,
    roi:
      s.investment_budget && s.investment_budget > 0 && s.revenue_generated != null
        ? s.revenue_generated / s.investment_budget
        : null,
    last_updated: lastUpdatedMap.get(s.id) ?? null,
  }));

  return result.sort((a, b) => {
    if (a.roi === null && b.roi === null) return 0;
    if (a.roi === null) return 1;
    if (b.roi === null) return -1;
    return b.roi - a.roi;
  });
}

export async function getPendingReminders(): Promise<PendingReminder[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_notes")
    .select(`id, student_id, contact_type, content, reminder_date, reminder_note, students(name)`)
    .not("reminder_date", "is", null)
    .order("reminder_date");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (data ?? [])
    .map((note: any) => {
      const reminderDate = new Date(note.reminder_date);
      reminderDate.setHours(0, 0, 0, 0);

      let urgency: "vencido" | "hoje" | "esta-semana";
      if (reminderDate < today) {
        urgency = "vencido";
      } else if (reminderDate.getTime() === today.getTime()) {
        urgency = "hoje";
      } else {
        const daysUntil = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        urgency = daysUntil <= 7 ? "esta-semana" : null as any;
      }

      return {
        id: note.id,
        student_id: note.student_id,
        student_name: note.students.name,
        contact_type: note.contact_type,
        content: note.content,
        reminder_date: note.reminder_date,
        reminder_note: note.reminder_note,
        urgency,
      };
    })
    .filter((r): r is PendingReminder => r.urgency !== null);
}

// ── Incubadora Stats ──────────────────────────────────────────────────────────

export interface IncubadoraStats {
  alunos: {
    total: number;
    ativos: number;
    suspensos: number;
    por_nivel: { aprendiz: number; fazedor: number; referencia: number };
  };
  progresso: {
    media_progresso: number;
    alunos_inativos_7dias: number;
    alunos_inativos_14dias: number;
    inativos_7dias_ids: string[];
    inativos_14dias_ids: string[];
  };
  suporte: {
    abertos: number;
    urgentes: number;
    em_analise: number;
  };
  emergencia: {
    pendentes: number;
  };
  roi: {
    alunos_com_roi_positivo: number;
    alunos_sem_receita: number;
    sem_receita_ids: string[];
  };
  renovacoes: {
    proximas_30dias: number;
    em_atraso: number;
  };
}

export async function getIncubadoraStats(): Promise<IncubadoraStats> {
  const supabase = await createClient();

  const [
    { data: studentRows },
    { count: totalLessons },
    { data: completionRows },
    { data: ticketRows },
    { count: emergencyPendentes },
    roiSummary,
    renewalAlerts,
  ] = await Promise.all([
    supabase.from("students").select("id, status, level, user_id"),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
    supabase.from("lesson_completions").select("student_id, completed_at"),
    supabase.from("support_tickets").select("status, priority"),
    supabase
      .from("emergency_calls")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),
    getStudentsROISummary(),
    getStudentsWithRenewalAlerts(),
  ]);

  const all = (studentRows ?? []) as {
    id: string;
    status: string;
    level: string;
    user_id: string | null;
  }[];

  const ativos    = all.filter((s) => s.status === "ativo").length;
  const suspensos = all.filter((s) => s.status === "suspenso").length;
  const por_nivel = {
    aprendiz:   all.filter((s) => s.status === "ativo" && s.level === "aprendiz").length,
    fazedor:    all.filter((s) => s.status === "ativo" && s.level === "fazedor").length,
    referencia: all.filter((s) => s.status === "ativo" && s.level === "referencia").length,
  };

  const now = Date.now();
  const rows = (completionRows ?? []) as { student_id: string; completed_at: string }[];

  const lastActivityByUserId = new Map<string, number>();
  const completionsByUser    = new Map<string, number>();
  for (const row of rows) {
    const t = new Date(row.completed_at).getTime();
    if (t > (lastActivityByUserId.get(row.student_id) ?? 0)) {
      lastActivityByUserId.set(row.student_id, t);
    }
    completionsByUser.set(row.student_id, (completionsByUser.get(row.student_id) ?? 0) + 1);
  }

  const lessons = totalLessons ?? 0;
  const activeStudents = all.filter((s) => s.status === "ativo" && s.user_id);

  let sumProgress = 0;
  let alunos_inativos_7dias  = 0;
  let alunos_inativos_14dias = 0;
  const inativos_7dias_ids:  string[] = [];
  const inativos_14dias_ids: string[] = [];

  for (const s of activeStudents) {
    const uid   = s.user_id!;
    const count = completionsByUser.get(uid) ?? 0;
    sumProgress += lessons > 0 ? (count / lessons) * 100 : 0;

    const last = lastActivityByUserId.get(uid);
    if (!last) {
      alunos_inativos_7dias++;
      alunos_inativos_14dias++;
      inativos_7dias_ids.push(s.id);
      inativos_14dias_ids.push(s.id);
    } else {
      const days = Math.floor((now - last) / 86_400_000);
      if (days > 7)  { alunos_inativos_7dias++;  inativos_7dias_ids.push(s.id); }
      if (days > 14) { alunos_inativos_14dias++; inativos_14dias_ids.push(s.id); }
    }
  }

  const media_progresso =
    activeStudents.length > 0 ? Math.round(sumProgress / activeStudents.length) : 0;

  const tickets = (ticketRows ?? []) as { status: string; priority: string }[];
  const abertos    = tickets.filter((t) => t.status === "aberto").length;
  const em_analise = tickets.filter((t) => t.status === "em_analise").length;
  const urgentes   = tickets.filter(
    (t) => t.priority === "urgente" && t.status !== "resolvido",
  ).length;

  const alunos_com_roi_positivo = roiSummary.filter(
    (s) => s.roi !== null && s.roi >= 1,
  ).length;
  const semReceitaStudents = roiSummary.filter(
    (s) => !s.revenue_generated || s.revenue_generated === 0,
  );
  const alunos_sem_receita = semReceitaStudents.length;
  const sem_receita_ids = semReceitaStudents.map((s) => s.id);

  const proximas_30dias = renewalAlerts.filter((a) => a.dias_restantes >= 0).length;
  const em_atraso       = renewalAlerts.filter((a) => a.dias_restantes < 0).length;

  return {
    alunos:    { total: all.length, ativos, suspensos, por_nivel },
    progresso: { media_progresso, alunos_inativos_7dias, alunos_inativos_14dias, inativos_7dias_ids, inativos_14dias_ids },
    suporte:   { abertos, urgentes, em_analise },
    emergencia:{ pendentes: emergencyPendentes ?? 0 },
    roi:       { alunos_com_roi_positivo, alunos_sem_receita, sem_receita_ids },
    renovacoes:{ proximas_30dias, em_atraso },
  };
}
