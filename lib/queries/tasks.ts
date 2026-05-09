import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types";

export interface TaskWithRelations extends Task {
  status: { id: string; key: string; label: string; color: string } | null;
  client: { id: string; name: string } | null;
  assignee: { id: string; full_name: string; email: string } | null;
}

export async function getTasks(filters?: {
  clientId?: string;
  assigneeId?: string;
  statusId?: string;
}): Promise<TaskWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select(
      `
      *,
      status:task_statuses(id, key, label, color),
      client:clients(id, name),
      assignee:team_members!tasks_assignee_id_fkey(id, full_name, email)
      `,
    )
    .order("created_at", { ascending: false });

  if (filters?.clientId) query = query.eq("client_id", filters.clientId);
  if (filters?.assigneeId) query = query.eq("assignee_id", filters.assigneeId);
  if (filters?.statusId) query = query.eq("status_id", filters.statusId);

  const { data } = await query;
  return (data ?? []) as TaskWithRelations[];
}

export async function getTaskById(id: string): Promise<TaskWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(
      `
      *,
      status:task_statuses(id, key, label, color),
      client:clients(id, name),
      assignee:team_members!tasks_assignee_id_fkey(id, full_name, email)
      `,
    )
    .eq("id", id)
    .maybeSingle();

  return (data ?? null) as TaskWithRelations | null;
}
