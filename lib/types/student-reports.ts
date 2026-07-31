// Types and pure helpers for student reports.
// Safe to import in Client Components — no server-only code here.

export interface SnapshotStudent {
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  level: string;
  status: string;
  turma: string | null;
  entry_type: string | null;
  nicho: string | null;
  subnicho: string | null;
  priority: string | null;
  coach_name: string;
  start_date: string | null;
  end_date: string | null;
  revenue_generated: number;
  investment_budget: number;
  revenue_goal: number | null;
  renewal_status: string;
  renewal_date: string | null;
  renewal_notes: string | null;
  renewal_decided_at: string | null;
}

export interface SnapshotAggregate {
  sessions_total: number;
  sessions_completed: number;
  checklist_completed: number;
  checklist_total: number;
  notes_total: number;
  notes_in_period: number;
  revenue_generated: number;
  investment_budget: number;
  roi: number | null;
  products_total: number;
  products_active: number;
  launches_total: number;
  launches_completed: number;
  launches_with_debrief: number;
  diary_entries: number;
  meetings_total: number;
  meetings_in_period: number;
}

export interface SnapshotSession {
  label: string;
  completed: boolean;
  completed_at: string | null;
}

export interface SnapshotChecklistItem {
  group: string;
  label: string;
  done: boolean;
}

export interface SnapshotRevenueEntry {
  date: string;
  value: number;
  note: string | null;
}

export interface SnapshotBriefingNegocio {
  nome_negocio?: string;
  nicho?: string;
  proposta_valor?: string;
  diferencial?: string;
  historia?: string;
  resultados_passados?: string;
  missao?: string;
  visao?: string;
  publico_alvo?: string;
  dores_resolvidas?: string[];
  transformacao_entregue?: string;
  objetivos?: { descricao: string; prioridade: string }[];
  valores?: { palavra: string; explicacao?: string }[];
  swot?: { forcas: string[]; fraquezas: string[]; oportunidades: string[]; ameacas: string[] };
  concorrentes?: { nome: string; url?: string; observacoes?: string }[];
  referencias?: { nome: string; url?: string; porque: string }[];
}

export interface SnapshotBriefing {
  is_complete: boolean;
  review_status: string | null;
  negocio: SnapshotBriefingNegocio | null;
  objecoes: { objecao: string; resposta: string }[];
}

export interface SnapshotProduct {
  name: string;
  product_type: string | null;
  product_status: string;
  price: number | null;
  is_archived: boolean;
  value_ladder_position: number | null;
  promise: string | null;
  description: string | null;
  beneficios: string[];
  bonus: string[];
}

export interface SnapshotDebrief {
  investimento_total: number | null;
  leads_totais: number | null;
  visitantes_pagina: number | null;
  total_vendas: number | null;
  receita_liquida_fase_venda: number | null;
  downsell_receita_liquida: number | null;
  ao_vivo_estavel: number | null;
  ao_vivo_maximo: number | null;
  leads_wpp: number | null;
  referencias_geradas: number | null;
  downsell_vendas: number | null;
  observacoes: string | null;
}

export interface SnapshotLaunch {
  title: string;
  type: string | null;
  status: string;
  launch_date: string | null;
  start_date: string | null;
  end_date: string | null;
  goal: string | null;
  ticket: number | null;
  channels: string[];
  promise: string | null;
  budget_total: number;
  sales_goal_1_count: number | null;
  sales_goal_1_revenue: number | null;
  sales_goal_2_count: number | null;
  sales_goal_2_revenue: number | null;
  debrief: SnapshotDebrief | null;
}

export interface SnapshotNote {
  date: string;
  contact_type: string;
  content: string;
  author: string;
  involvement: string | null;
  motivation: string | null;
  reminder_date: string | null;
  reminder_note: string | null;
}

export interface SnapshotNotePreview {
  date: string;
  contact_type: string;
  content_preview: string;
  author: string;
}

export interface SnapshotDiaryEntry {
  date: string;
  content: string;
  updated_at: string;
}

export interface SnapshotMeeting {
  title: string;
  date: string;
  duration_minutes: number | null;
  location: string | null;
  agenda_md: string | null;
  notes_md: string | null;
}

export interface SnapshotMeetingPreview {
  title: string;
  date: string;
  duration_minutes: number | null;
}

export interface ReportSnapshot {
  student: SnapshotStudent;
  aggregate: SnapshotAggregate;
  sessions: SnapshotSession[];
  checklist: SnapshotChecklistItem[] | null;
  checklist_notes: string | null;
  revenue_history: SnapshotRevenueEntry[];
  briefing: SnapshotBriefing | null;
  products: SnapshotProduct[];
  launches: SnapshotLaunch[];
  notes_in_period: SnapshotNote[];
  notes_history: SnapshotNotePreview[];
  diary: SnapshotDiaryEntry[];
  meetings_in_period: SnapshotMeeting[];
  other_meetings: SnapshotMeetingPreview[];
}

export interface StudentReport {
  id: string;
  student_id: string;
  generated_by: string | null;
  title: string;
  period_start: string;
  period_end: string;
  kpis: ReportSnapshot | Record<string, unknown>;
  content_md: string | null;
  status: "rascunho" | "publicado";
  published_at: string | null;
  created_at: string;
  updated_at: string;
  generator: { full_name: string } | null;
}

export function isFullSnapshot(kpis: StudentReport["kpis"]): kpis is ReportSnapshot {
  return typeof kpis === "object" && kpis !== null && "student" in kpis && "aggregate" in kpis;
}
