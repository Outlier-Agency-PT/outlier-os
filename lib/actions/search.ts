"use server";

import { createClient } from "@/lib/supabase/server";
import type { TaskPriority } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface TaskSearchResult {
  id: string;
  title: string;
  priority: TaskPriority;
  status: { id: string; key: string; label: string; color: string } | null;
  list: {
    id: string;
    name: string;
    space: { id: string; name: string } | null;
  } | null;
  member: { full_name: string } | null;
}

export interface ClientSearchResult {
  id: string;
  name: string;
  status: { id: string; key: string; label: string; color: string } | null;
}

export interface LaunchSearchResult {
  id: string;
  name: string;
  status: { id: string; key: string; label: string; color: string } | null;
}

export interface GlobalSearchResults {
  tasks: TaskSearchResult[];
  clients: ClientSearchResult[];
  launches: LaunchSearchResult[];
}

const TASK_SELECT = `
  id, title, priority,
  status:task_statuses(id, key, label, color),
  list:task_lists(id, name, space:task_spaces(id, name)),
  member:team_members!tasks_assignee_id_fkey(full_name)
`;

const GROUP_LIMIT = 5;

async function searchTasks(supabase: SupabaseServerClient, pattern: string): Promise<TaskSearchResult[]> {
  const [byTitle, byDescription] = await Promise.all([
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .ilike("title", pattern)
      .order("created_at", { ascending: false })
      .limit(GROUP_LIMIT),
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .ilike("description", pattern)
      .order("created_at", { ascending: false })
      .limit(GROUP_LIMIT),
  ]);

  const merged = new Map<string, TaskSearchResult>();
  for (const task of [...(byTitle.data ?? []), ...(byDescription.data ?? [])] as unknown as TaskSearchResult[]) {
    merged.set(task.id, task);
  }

  return Array.from(merged.values()).slice(0, GROUP_LIMIT);
}

async function searchClients(supabase: SupabaseServerClient, pattern: string): Promise<ClientSearchResult[]> {
  const { data } = await supabase
    .from("clients")
    .select("id, name, status:client_statuses(id, key, label, color)")
    .ilike("name", pattern)
    .order("name", { ascending: true })
    .limit(GROUP_LIMIT);

  return (data ?? []) as unknown as ClientSearchResult[];
}

async function searchLaunches(supabase: SupabaseServerClient, pattern: string): Promise<LaunchSearchResult[]> {
  const { data } = await supabase
    .from("launches")
    .select("id, name, status:launch_statuses(id, key, label, color)")
    .ilike("name", pattern)
    .order("name", { ascending: true })
    .limit(GROUP_LIMIT);

  return (data ?? []) as unknown as LaunchSearchResult[];
}

// RLS aplica-se automaticamente via createClient() (sessão do utilizador) —
// não é preciso filtrar manualmente por role/módulo aqui.
export async function searchGlobalAction(query: string): Promise<GlobalSearchResults> {
  const trimmed = query.trim();
  if (!trimmed) return { tasks: [], clients: [], launches: [] };

  const supabase = await createClient();
  const pattern = `%${trimmed}%`;

  const [tasks, clients, launches] = await Promise.all([
    searchTasks(supabase, pattern),
    searchClients(supabase, pattern),
    searchLaunches(supabase, pattern),
  ]);

  return { tasks, clients, launches };
}
