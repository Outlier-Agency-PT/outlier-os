import { createClient } from "@/lib/supabase/server";
export type { Activity } from "@/lib/utils/activity-helpers";
export { describeActivity } from "@/lib/utils/activity-helpers";

export async function getRecentActivity(limit = 20, memberId?: string): Promise<Activity[]> {
  const supabase = await createClient();
  let query = supabase
    .from("activity_log")
    .select(`*, member:team_members(full_name)`)
    .not("member_id", "is", null)
    .neq("action", "updated")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (memberId) {
    query = query.eq("member_id", memberId);
  }

  const { data } = await query;
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
