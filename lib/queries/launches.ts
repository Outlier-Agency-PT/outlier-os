import { createClient } from "@/lib/supabase/server";

export interface LaunchWithRelations {
  id: string;
  name: string;
  client_id: string | null;
  status_id: string | null;
  tier: string | null;
  template_id: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_at: string;
  status: { id: string; key: string; label: string; color: string } | null;
  client: { id: string; name: string } | null;
  task_count?: number;
  task_completed?: number;
}

export async function getLaunches(): Promise<LaunchWithRelations[]> {
  const supabase = await createClient();
  const { data: launches } = await supabase
    .from("launches")
    .select(
      `
      *,
      status:launch_statuses(id, key, label, color),
      client:clients(id, name)
      `,
    )
    .order("created_at", { ascending: false });

  if (!launches) return [];

  // Contar tarefas por lançamento (em paralelo)
  const launchesWithCounts = await Promise.all(
    (launches as LaunchWithRelations[]).map(async (l) => {
      const { count: total } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("launch_id", l.id);

      const { data: closedStatuses } = await supabase
        .from("task_statuses")
        .select("id")
        .eq("key", "concluido")
        .maybeSingle();

      let completed = 0;
      if (closedStatuses && (closedStatuses as { id: string }).id) {
        const { count } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("launch_id", l.id)
          .eq("status_id", (closedStatuses as { id: string }).id);
        completed = count ?? 0;
      }

      return { ...l, task_count: total ?? 0, task_completed: completed };
    }),
  );

  return launchesWithCounts;
}

export async function getLaunchById(id: string): Promise<LaunchWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("launches")
    .select(
      `
      *,
      status:launch_statuses(id, key, label, color),
      client:clients(id, name)
      `,
    )
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as LaunchWithRelations | null;
}

export interface LaunchTemplate {
  id: string;
  name: string;
  tier: string | null;
  duration_days: number | null;
  description: string | null;
  active: boolean;
  task_count?: number;
}

export async function getLaunchTemplates(): Promise<LaunchTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("launch_templates")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (!data) return [];

  // Contar tarefas
  const result = await Promise.all(
    (data as LaunchTemplate[]).map(async (t) => {
      const { count } = await supabase
        .from("launch_template_tasks")
        .select("*", { count: "exact", head: true })
        .eq("template_id", t.id);
      return { ...t, task_count: count ?? 0 };
    }),
  );
  return result;
}

export async function getLaunchTemplateWithTasks(id: string) {
  const supabase = await createClient();
  const [{ data: template }, { data: tasks }] = await Promise.all([
    supabase.from("launch_templates").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("launch_template_tasks")
      .select("*")
      .eq("template_id", id)
      .order("sort_order"),
  ]);
  return { template, tasks: tasks ?? [] };
}
