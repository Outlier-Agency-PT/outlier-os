import { createClient } from "@/lib/supabase/server";

export interface Activity {
  id: string;
  member_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  created_at: string;
  member: { full_name: string } | null;
}

const ENTITY_LABELS: Record<string, string> = {
  clients: "cliente",
  tasks: "tarefa",
  launches: "lançamento",
  contents: "conteúdo",
  students: "aluno",
  objectives: "objetivo",
  meetings: "reunião",
  processes: "processo",
  transactions: "transação",
};

const ACTION_LABELS: Record<string, string> = {
  created: "criou",
  updated: "atualizou",
  deleted: "eliminou",
};

export function describeActivity(a: Activity): string {
  const entity = ENTITY_LABELS[a.entity_type] ?? a.entity_type;
  const action = ACTION_LABELS[a.action] ?? a.action;
  const label = a.entity_label ? `'${a.entity_label}'` : "";
  return `${action} ${entity} ${label}`.trim();
}

export async function getRecentActivity(limit = 10): Promise<Activity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_log")
    .select(`*, member:team_members(full_name)`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Activity[];
}
