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

// ─── Gantt ───────────────────────────────────────────────────────────────────

export interface GanttTask {
  id: string;
  title: string;
  start_date: string | null;
  due_date: string | null;
  priority: string;
  status_id: string | null;
  assignees: string[];
  list_id: string | null;
  list_name: string | null;
  space_id: string | null;
  space_name: string | null;
  client: { id: string; name: string } | null;
  estimate_points: number | null;
  dependencies: Array<{ id: string; title: string; type: string }>;
}

export async function getTasksForGantt(): Promise<GanttTask[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tasks")
    .select(
      `
      id, title, start_date, due_date, priority, status_id,
      assignees, list_id, estimate_points,
      list:task_lists(id, name, space_id, space:task_spaces(id, name)),
      client:clients(id, name)
      `,
    )
    .or("start_date.not.is.null,due_date.not.is.null")
    .is("parent_task_id", null)
    .order("start_date", { ascending: true, nullsFirst: false });

  const tasks: GanttTask[] = ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    title: row.title,
    start_date: row.start_date ?? null,
    due_date: row.due_date ?? null,
    priority: row.priority,
    status_id: row.status_id ?? null,
    assignees: row.assignees ?? [],
    list_id: row.list_id ?? null,
    list_name: row.list?.name ?? null,
    space_id: row.list?.space?.id ?? null,
    space_name: row.list?.space?.name ?? null,
    client: row.client ?? null,
    estimate_points: row.estimate_points ?? null,
    dependencies: [],
  }));

  if (tasks.length === 0) return tasks;

  const taskIds = tasks.map((t) => t.id);
  const depsMap = new Map<string, GanttTask["dependencies"]>(taskIds.map((id) => [id, []]));

  const [{ data: depsOut }, { data: depsIn }] = await Promise.all([
    // Dependências onde esta tarefa aponta para outra
    supabase
      .from("task_dependencies")
      .select("task_id, type, target:tasks!task_dependencies_depends_on_id_fkey(id, title)")
      .in("task_id", taskIds),
    // Dependências onde esta tarefa é o alvo
    supabase
      .from("task_dependencies")
      .select("depends_on_id, type, source:tasks!task_dependencies_task_id_fkey(id, title)")
      .in("depends_on_id", taskIds),
  ]);

  for (const dep of (depsOut ?? []) as any[]) {
    const list = depsMap.get(dep.task_id);
    if (list && dep.target) {
      list.push({ id: dep.target.id, title: dep.target.title, type: dep.type });
    }
  }

  for (const dep of (depsIn ?? []) as any[]) {
    const list = depsMap.get(dep.depends_on_id);
    if (list && dep.source) {
      const inverseType =
        dep.type === "blocks" ? "blocked_by" : dep.type === "blocked_by" ? "blocks" : "related";
      list.push({ id: dep.source.id, title: dep.source.title, type: inverseType });
    }
  }

  return tasks.map((t) => ({ ...t, dependencies: depsMap.get(t.id) ?? [] }));
}

// ─── Student Tasks ───────────────────────────────────────────────────────────

export interface StudentTask {
  id: string;
  title: string;
  status: { label: string; color: string } | null;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  estimate_points: number | null;
  delivery_url: string | null;
  list_name: string | null;
  space_name: string | null;
}

export async function getTasksForStudent(userId: string): Promise<StudentTask[]> {
  const supabase = await createClient();

  const SELECT = `id, title, priority, due_date, completed_at, estimate_points, delivery_url,
       status:task_statuses(label, color),
       list:task_lists(name, space:task_spaces(name))`;

  const [{ data: byId, error: errById }, { data: byArray, error: errByArray }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(SELECT)
        .eq("assignee_id", userId)
        .order("completed_at", { ascending: true, nullsFirst: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select(SELECT)
        .contains("assignees", [userId])
        .order("completed_at", { ascending: true, nullsFirst: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
    ]);

  if (errById)
    console.error("[getTasksForStudent] assignee_id query:", errById.message);
  if (errByArray)
    console.error("[getTasksForStudent] assignees array query:", errByArray.message);

  const seen = new Set<string>();
  const rows: any[] = [];
  for (const r of [...(byId ?? []), ...(byArray ?? [])]) {
    if (!seen.has(r.id)) { seen.add(r.id); rows.push(r); }
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status ?? null,
    priority: row.priority,
    due_date: row.due_date ?? null,
    completed_at: row.completed_at ?? null,
    estimate_points: row.estimate_points ?? null,
    delivery_url: row.delivery_url ?? null,
    list_name: row.list?.name ?? null,
    space_name: row.list?.space?.name ?? null,
  }));
}

export interface StudentTasksGrouped {
  thisWeek: StudentTask[];
  overdue: StudentTask[];
  upcoming: StudentTask[];
  noDueDate: StudentTask[];
  completedThisWeek: StudentTask[];
}

export function groupTasksByWeek(tasks: StudentTask[]): StudentTasksGrouped {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const result: StudentTasksGrouped = {
    thisWeek: [],
    overdue: [],
    upcoming: [],
    noDueDate: [],
    completedThisWeek: [],
  };

  for (const task of tasks) {
    if (task.completed_at) {
      const d = new Date(task.completed_at);
      if (d >= monday && d <= sunday) result.completedThisWeek.push(task);
      continue;
    }
    if (!task.due_date) {
      result.noDueDate.push(task);
      continue;
    }
    const [y, m, dd] = task.due_date.split("-").map(Number);
    const due = new Date(y, m - 1, dd);
    if (due < monday) result.overdue.push(task);
    else if (due <= sunday) result.thisWeek.push(task);
    else result.upcoming.push(task);
  }

  return result;
}

// ─── Workload ────────────────────────────────────────────────────────────────

export interface WorkloadMember {
  member_id: string;
  member_name: string;
  avatar_url: string | null;
  estimated_hours: number;
  logged_hours: number;
  task_count: number;
}

function startOfCurrentWeekISO(): string {
  const now = new Date();

  // Determine today's date in Europe/Lisbon (handles UTC+0 winter / UTC+1 summer)
  const lisbonDow = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Lisbon",
    weekday: "short",
  }).format(now); // "Mon", "Tue", …
  const lisbonDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
  }).format(now); // "YYYY-MM-DD"

  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(lisbonDow);
  const diffToMonday = dayIndex === 0 ? -6 : 1 - dayIndex;

  // Monday's calendar date in Lisbon
  const [y, m, d] = lisbonDateStr.split("-").map(Number);
  const mondayDate = new Date(Date.UTC(y, m - 1, d + diffToMonday));
  const mondayStr = mondayDate.toISOString().slice(0, 10); // "YYYY-MM-DD"

  // Find Lisbon's UTC offset on that Monday (0h UTC → what hour is it in Lisbon?)
  const midnightUTC = new Date(mondayStr + "T00:00:00Z");
  const lisbonHourAtMidnight = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Lisbon",
      hour: "numeric",
      hourCycle: "h23",
    }).format(midnightUTC),
    10,
  ); // 0 in winter (UTC+0), 1 in summer (UTC+1)

  // Monday 00:00 Lisbon = midnight UTC shifted back by offset
  midnightUTC.setUTCHours(-lisbonHourAtMidnight);
  return midnightUTC.toISOString();
}

export async function getWorkloadByMember(): Promise<WorkloadMember[]> {
  const supabase = await createClient();

  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("id, full_name, avatar_url")
    .eq("active", true)
    .order("full_name");

  if (membersError) {
    console.error("[getWorkloadByMember] erro ao buscar membros:", membersError.message);
    return [];
  }
  if (!members || members.length === 0) return [];

  const weekStart = startOfCurrentWeekISO();

  const results = await Promise.all(
    (members as { id: string; full_name: string; avatar_url: string | null }[]).map(
      async (member) => {
        const [
          { data: byAssigneeId, error: errById },
          { data: byAssigneesArray, error: errByArray },
          { data: logs, error: errLogs },
        ] = await Promise.all([
          supabase
            .from("tasks")
            .select("id, estimate_points")
            .eq("assignee_id", member.id)
            .is("completed_at", null),
          supabase
            .from("tasks")
            .select("id, estimate_points")
            .contains("assignees", [member.id])
            .is("completed_at", null),
          supabase
            .from("task_time_logs")
            .select("duration_minutes")
            .eq("member_id", member.id)
            .gte("start_at", weekStart),
        ]);

        if (errById)
          console.error(`[getWorkloadByMember] assignee_id query (${member.full_name}):`, errById.message);
        if (errByArray)
          console.error(`[getWorkloadByMember] assignees array query (${member.full_name}):`, errByArray.message);
        if (errLogs)
          console.error(`[getWorkloadByMember] time logs query (${member.full_name}):`, errLogs.message);

        // Deduplicate tasks that appear in both queries (member in both assignee_id and assignees[])
        const seen = new Set<string>();
        const tasks: { id: string; estimate_points: number | null }[] = [];
        for (const t of [...(byAssigneeId ?? []), ...(byAssigneesArray ?? [])]) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            tasks.push(t);
          }
        }

        const estimated_hours = tasks.reduce(
          (sum, t) => sum + (t.estimate_points ?? 0),
          0,
        );
        const logged_minutes = (logs ?? []).reduce(
          (sum, l: { duration_minutes: number | null }) => sum + (l.duration_minutes ?? 0),
          0,
        );

        return {
          member_id: member.id,
          member_name: member.full_name,
          avatar_url: member.avatar_url,
          estimated_hours,
          logged_hours: Math.round((logged_minutes / 60) * 10) / 10,
          task_count: tasks.length,
        };
      },
    ),
  );

  return results.sort((a, b) => b.estimated_hours - a.estimated_hours);
}
