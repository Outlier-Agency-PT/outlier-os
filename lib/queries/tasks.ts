import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types";

export interface TaskWithRelations extends Task {
  status: { id: string; key: string; label: string; color: string } | null;
  client: { id: string; name: string } | null;
  assignee: { id: string; full_name: string; email: string } | null;
  isBlocked?: boolean;
}

export interface TaskSpace {
  id: string;
  name: string;
  color: string;
  owner_id: string | null;
  position: number;
  is_private: boolean;
  created_at: string;
  lists: TaskList[];
}

export interface TaskList {
  id: string;
  space_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface TaskWithHierarchy extends TaskWithRelations {
  list: { id: string; name: string } | null;
  parent_task_id: string | null;
  assignees: string[]; // array de UUIDs
  position: number;
  subtasks?: TaskWithHierarchy[];
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
      estimate_points,
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
      estimate_points,
      status:task_statuses(id, key, label, color),
      client:clients(id, name),
      assignee:team_members!tasks_assignee_id_fkey(id, full_name, email)
      `,
    )
    .eq("id", id)
    .maybeSingle();

  return (data ?? null) as TaskWithRelations | null;
}

export async function getTaskSpaces(): Promise<TaskSpace[]> {
  const supabase = await createClient();
  const { data: spaces } = await supabase
    .from("task_spaces")
    .select("*")
    .order("position", { ascending: true });

  if (!spaces) return [];

  const { data: lists } = await supabase
    .from("task_lists")
    .select("*")
    .order("position", { ascending: true });

  const listsBySpace = new Map<string, TaskList[]>();
  for (const list of lists ?? []) {
    if (!listsBySpace.has(list.space_id)) {
      listsBySpace.set(list.space_id, []);
    }
    listsBySpace.get(list.space_id)!.push(list);
  }

  return spaces.map((space: any) => ({
    ...space,
    lists: listsBySpace.get(space.id) ?? [],
  }));
}

export async function getTasksByList(listId: string): Promise<TaskWithHierarchy[]> {
  const supabase = await createClient();

  // Buscar tarefas raiz (parent_task_id is null)
  const { data: rootTasks } = await supabase
    .from("tasks")
    .select(
      `
      *,
      estimate_points,
      status:task_statuses(id, key, label, color),
      client:clients(id, name),
      assignee:team_members!tasks_assignee_id_fkey(id, full_name, email),
      list:task_lists(id, name)
      `,
    )
    .eq("list_id", listId)
    .is("parent_task_id", null)
    .order("position", { ascending: true });

  if (!rootTasks) return [];

  // Para cada tarefa, buscar subtarefas
  const tasksWithSubtasks: TaskWithHierarchy[] = [];
  for (const rootTask of rootTasks) {
    const { data: subtasks } = await supabase
      .from("tasks")
      .select(
        `
        *,
        estimate_points,
        status:task_statuses(id, key, label, color),
        client:clients(id, name),
        assignee:team_members!tasks_assignee_id_fkey(id, full_name, email),
        list:task_lists(id, name)
        `,
      )
      .eq("parent_task_id", rootTask.id)
      .order("position", { ascending: true });

    tasksWithSubtasks.push({
      ...rootTask,
      subtasks: (subtasks ?? []) as TaskWithHierarchy[],
    });
  }

  // Marcar tarefas bloqueadas por dependências 'blocked_by' cuja tarefa
  // bloqueadora ainda não foi concluída (para o cadeado no card do kanban)
  const allTaskIds = tasksWithSubtasks.map((t) => t.id);
  if (allTaskIds.length > 0) {
    const { data: blockingDeps } = await supabase
      .from("task_dependencies")
      .select("task_id, depends_on:tasks!task_dependencies_depends_on_id_fkey(completed_at)")
      .in("task_id", allTaskIds)
      .eq("type", "blocked_by");

    const blockedIds = new Set(
      (blockingDeps ?? [])
        .filter((d: any) => !d.depends_on?.completed_at)
        .map((d: any) => d.task_id as string),
    );

    for (const task of tasksWithSubtasks) {
      task.isBlocked = blockedIds.has(task.id);
    }
  }

  return tasksWithSubtasks as TaskWithHierarchy[];
}
