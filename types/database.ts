// Tipos placeholder até gerar via `npm run db:types` após push das migrations.
// Para gerar tipos reais:
//   npx supabase gen types typescript --project-id <PROJECT-REF> > types/database.ts
//
// Por agora, usamos tipos relaxados para destravar o build inicial.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

interface TableDef {
  Row: Row;
  Insert: Row;
  Update: Row;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      team_members: TableDef;
      client_statuses: TableDef;
      task_statuses: TableDef;
      launch_statuses: TableDef;
      content_statuses: TableDef;
      clients: TableDef;
      launch_templates: TableDef;
      launch_template_tasks: TableDef;
      launches: TableDef;
      launch_comments: TableDef;
      tasks: TableDef;
      task_time_logs: TableDef;
      task_comments: TableDef;
      contents: TableDef;
      content_files: TableDef;
      content_feedback: TableDef;
      students: TableDef;
      student_session_types: TableDef;
      student_sessions: TableDef;
      reports: TableDef;
      financial_categories: TableDef;
      transactions: TableDef;
      recurring_transactions: TableDef;
      objectives: TableDef;
      key_results: TableDef;
      process_categories: TableDef;
      processes: TableDef;
      meetings: TableDef;
      favorites: TableDef;
      activity_log: TableDef;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      client_type: "one_shot" | "long_term" | "interno";
      student_level: "aprendiz" | "fazedor" | "referencia" | "suspenso";
      task_priority: "sem_prioridade" | "baixa" | "media" | "alta" | "urgente";
      confidence_level: "baixa" | "media" | "alta";
      quarter_label: "Q1" | "Q2" | "Q3" | "Q4";
      transaction_type: "receita" | "despesa";
      recurring_frequency: "mensal" | "trimestral" | "semestral" | "anual";
      report_type: "semanal" | "mensal";
      report_status: "rascunho" | "publicado";
      member_role: "admin" | "membro";
    };
    CompositeTypes: Record<string, never>;
  };
}
