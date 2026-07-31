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
    .not("member_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Activity[];
}

export async function getActivityForClient(clientId: string, limit = 20): Promise<Activity[]> {
  const supabase = await createClient();
  // Buscar entity_ids relacionados (cliente + tarefas + lançamentos + conteúdos + reuniões do cliente)
  const [{ data: tasks }, { data: launches }, { data: contents }, { data: meetings }] =
    await Promise.all([
      supabase.from("tasks").select("id").eq("client_id", clientId),
      supabase.from("launches").select("id").eq("client_id", clientId),
      supabase.from("contents").select("id").eq("client_id", clientId),
      supabase.from("meetings").select("id").eq("client_id", clientId),
    ]);

  const ids: string[] = [
    clientId,
    ...((tasks ?? []) as { id: string }[]).map((t) => t.id),
    ...((launches ?? []) as { id: string }[]).map((l) => l.id),
    ...((contents ?? []) as { id: string }[]).map((c) => c.id),
    ...((meetings ?? []) as { id: string }[]).map((m) => m.id),
  ];

  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("activity_log")
    .select(`*, member:team_members(full_name)`)
    .in("entity_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Activity[];
}
