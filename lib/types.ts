// Tipos de domínio do Outlier OS — replicam o schema Postgres.
// Quando regenerares tipos com `npm run db:types`, podes substituir por imports daqui.

export type ClientType = "one_shot" | "long_term" | "interno";
export type TaskPriority = "sem_prioridade" | "baixa" | "media" | "alta" | "urgente";
export type MemberRole = "admin" | "membro";
export type TransactionType = "receita" | "despesa";

export interface Status {
  id: string;
  key: string;
  label: string;
  color: string;
  sort_order: number;
  active: boolean;
}

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: MemberRole;
  department: string | null;
  job_title: string | null;
  avatar_url: string | null;
  permissions_modules: string[];
  active: boolean;
}

export interface Client {
  id: string;
  name: string;
  client_type: ClientType;
  status_id: string | null;
  responsible_id: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  sector: string | null;
  monthly_value: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  public_share_token: string | null;
  public_share_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status_id: string | null;
  priority: TaskPriority;
  client_id: string | null;
  launch_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
  estimate_points: number | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeLog {
  id: string;
  task_id: string;
  member_id: string;
  start_at: string;
  end_at: string | null;
  duration_minutes: number | null;
  is_manual: boolean;
  description: string | null;
  created_at: string;
}

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  one_shot: "One Shot",
  long_term: "Long Term",
  interno: "Interno",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  sem_prioridade: "Sem prioridade",
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  sem_prioridade: "text-muted-foreground",
  baixa: "text-blue-500",
  media: "text-yellow-500",
  alta: "text-orange-500",
  urgente: "text-red-500",
};

export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  iniciativas: "Iniciativas",
  decisoes: "Decisões",
  mentorias: "Mentorias",
  clientes: "Clientes",
  tarefas: "Tarefas",
  lancamentos: "Lançamentos",
  conteudo: "Conteúdo",
  incubadora: "Incubadora",
  relatorios: "Relatórios",
  financeiro: "Financeiro",
  okrs: "OKRs",
  processos: "Processos",
  reunioes: "Reuniões",
  equipa: "Equipa",
  configuracoes: "Configurações",
};

export const ALL_MODULE_KEYS = Object.keys(MODULE_LABELS);

export const MODULE_GROUPS: Record<string, string[]> = {
  estrategia: ["iniciativas", "decisoes", "mentorias"],
  operacional: ["clientes", "tarefas", "lancamentos", "conteudo", "incubadora", "relatorios"],
  financeiro: ["financeiro"],
  gestao: ["okrs", "processos", "reunioes"],
};

export const MODULE_GROUP_LABELS: Record<string, string> = {
  estrategia: "Estratégia",
  operacional: "Operacional",
  financeiro: "Financeiro",
  gestao: "Gestão",
};

// ============================================================
// Iniciativas, Mentorias e Decisões (migration 0005)
// ============================================================

export type InitiativeStatus =
  | "ideia"
  | "planeamento"
  | "em_curso"
  | "em_pausa"
  | "concluida"
  | "cancelada";

export type InitiativePriority = "baixa" | "media" | "alta" | "critica";
export type InitiativeSource = "interno" | "cliente" | "mentoria" | "oportunidade" | "crise";
export type InitiativeHealth = "verde" | "amarelo" | "vermelho";

export interface Initiative {
  id: string;
  title: string;
  description: string | null;
  status: InitiativeStatus;
  priority: InitiativePriority;
  source: InitiativeSource;
  health: InitiativeHealth | null;
  owner_id: string | null;
  created_by: string | null;
  next_step: string | null;
  blocker: string | null;
  focus_this_week: boolean;
  needs_decision: boolean;
  decision_context: string | null;
  expected_impact: string | null;
  expected_effort: string | null;
  client_id: string | null;
  mentorship_id: string | null;
  parent_initiative_id: string | null;
  start_date: string | null;
  target_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface InitiativeUpdate {
  id: string;
  initiative_id: string;
  content: string;
  author_id: string | null;
  created_at: string;
}

export const INITIATIVE_STATUS_LABELS: Record<InitiativeStatus, string> = {
  ideia: "Ideia",
  planeamento: "Planeamento",
  em_curso: "Em curso",
  em_pausa: "Em pausa",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const INITIATIVE_STATUS_COLORS: Record<InitiativeStatus, string> = {
  ideia: "bg-slate-500/10 text-slate-500 border-slate-500/30",
  planeamento: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  em_curso: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  em_pausa: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  concluida: "bg-violet-500/10 text-violet-500 border-violet-500/30",
  cancelada: "bg-zinc-500/10 text-zinc-500 border-zinc-500/30",
};

export const INITIATIVE_PRIORITY_LABELS: Record<InitiativePriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const INITIATIVE_PRIORITY_COLORS: Record<InitiativePriority, string> = {
  baixa: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  media: "bg-yellow-500/10 text-yellow-600 border-yellow-500/25 dark:text-yellow-400",
  alta: "bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400",
  critica: "bg-red-500/15 text-red-600 border-red-500/40 font-semibold dark:text-red-400",
};

export const INITIATIVE_SOURCE_LABELS: Record<InitiativeSource, string> = {
  interno: "Interno",
  cliente: "Cliente",
  mentoria: "Mentoria",
  oportunidade: "Oportunidade",
  crise: "Crise",
};

export type MentorshipStatus = "ativa" | "em_pausa" | "concluida" | "arquivada";

export interface Mentorship {
  id: string;
  name: string;
  mentor: string | null;
  platform: string | null;
  url: string | null;
  description: string | null;
  started_at: string | null;
  status: MentorshipStatus;
  total_modules: number | null;
  notes: string | null;
  cover_emoji: string;
  created_at: string;
  updated_at: string;
}

export interface MentorshipModule {
  id: string;
  mentorship_id: string;
  title: string;
  order_index: number;
  consumed_at: string | null;
  duration_minutes: number | null;
  key_insights: string | null;
  raw_notes: string | null;
  created_at: string;
}

export type ImplementationStatus =
  | "pendente"
  | "a_implementar"
  | "em_curso"
  | "implementado"
  | "parqueada";

export interface ImplementationAction {
  id: string;
  mentorship_id: string;
  module_id: string | null;
  action: string;
  why: string | null;
  priority: TaskPriority;
  status: ImplementationStatus;
  due_date: string | null;
  task_id: string | null;
  initiative_id: string | null;
  done_at: string | null;
  created_at: string;
}

export const MENTORSHIP_STATUS_LABELS: Record<MentorshipStatus, string> = {
  ativa: "Ativa",
  em_pausa: "Em pausa",
  concluida: "Concluída",
  arquivada: "Arquivada",
};

export const IMPLEMENTATION_STATUS_LABELS: Record<ImplementationStatus, string> = {
  pendente: "Pendente",
  a_implementar: "A implementar",
  em_curso: "Em curso",
  implementado: "Implementado",
  parqueada: "Parqueada",
};

export type DecisionStatus = "pendente" | "decidida" | "adiada" | "arquivada";
export type DecisionImpact = "baixo" | "medio" | "alto" | "critico";

export interface Decision {
  id: string;
  title: string;
  context: string | null;
  options: string | null;
  status: DecisionStatus;
  impact: DecisionImpact | null;
  urgency: string | null;
  initiative_id: string | null;
  client_id: string | null;
  mentorship_id: string | null;
  decided_at: string | null;
  decision: string | null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
}

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  pendente: "Pendente",
  decidida: "Decidida",
  adiada: "Adiada",
  arquivada: "Arquivada",
};

export const DECISION_IMPACT_LABELS: Record<DecisionImpact, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};
