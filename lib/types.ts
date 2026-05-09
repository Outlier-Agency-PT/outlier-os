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
