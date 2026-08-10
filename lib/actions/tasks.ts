"use server";

// MIGRAÇÃO: Para atualizar tarefas existentes com list_id null para Backlog,
// execute no Supabase Studio:
// update tasks
// set list_id = '00000000-0000-0000-0000-000000000011'
// where list_id is null;

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTaskTimeLogs, getTaskDependencies, getActivityForTask } from "@/lib/queries/task-detail";
import { z } from "zod";
import type { TaskPriority } from "@/lib/types";

const taskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().nullable().optional(),
  status_id: z.string().uuid().nullable().optional(),
  priority: z.enum(["sem_prioridade", "baixa", "media", "alta", "urgente"]).default("sem_prioridade"),
  client_id: z.string().uuid().nullable().optional(),
  launch_id: z.string().uuid().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  estimate_points: z.number().nullable().optional(),
  list_id: z.string().uuid().nullable().optional(),
  parent_task_id: z.string().uuid().nullable().optional(),
  assignees: z.array(z.string().uuid()).optional(),
  position: z.number().optional(),
  completed_at: z.string().nullable().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_frequency: z.enum(["daily", "weekly"]).nullable().optional(),
  recurrence_day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  recurrence_template_id: z.string().uuid().nullable().optional(),
  recurrence_end_date: z.string().nullable().optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;

// Notifica cada novo assignee de uma tarefa. Usa o service role porque
// quem cria/edita a tarefa não é o destinatário — a RLS de notifications
// só permite a cada utilizador ler/marcar as suas próprias notificações,
// não inserir notificações para outros.
async function notifyNewAssignees(
  taskId: string,
  taskTitle: string,
  listId: string | null | undefined,
  newAssigneeIds: string[],
) {
  console.log("[notifyNewAssignees] antes:", { taskId, taskTitle, listId, newAssigneeIds });

  if (newAssigneeIds.length === 0) {
    console.log("[notifyNewAssignees] sem novos assignees — não vai inserir nada");
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(
    newAssigneeIds.map((userId) => ({
      user_id: userId,
      type: "task_assigned",
      title: "Nova tarefa atribuída",
      body: taskTitle,
      link: `/tarefas?taskId=${taskId}${listId ? `&list=${listId}` : ""}`,
    })),
  );

  console.log("[notifyNewAssignees] depois — erro do insert:", error);
}

function cleanInput(input: TaskInput) {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    cleaned[k] = v;
  }
  return cleaned;
}

export async function createTaskAction(input: TaskInput) {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...cleanInput(parsed.data), created_by: user.id })
    .select()
    .single();

  if (error) return { error: { _form: [error.message] } };

  const initialAssignees = [...new Set([...(parsed.data.assignees ?? []), parsed.data.assignee_id].filter(
    (v): v is string => Boolean(v),
  ))];
  console.log("[createTaskAction] antes de criar notificações, initialAssignees:", initialAssignees);
  await notifyNewAssignees(data.id, data.title, data.list_id, initialAssignees);
  console.log("[createTaskAction] depois de criar notificações");

  revalidatePath("/tarefas");
  return { data };
}

export async function updateTaskAction(id: string, input: Partial<TaskInput>) {
  const supabase = await createClient();
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    cleaned[k] = v === "" ? null : v;
  }

  // Sync completed_at whenever status_id changes
  if ("status_id" in cleaned) {
    if (cleaned.status_id) {
      const { data: targetStatus } = await supabase
        .from("task_statuses")
        .select("key")
        .eq("id", cleaned.status_id as string)
        .maybeSingle();
      cleaned.completed_at =
        targetStatus?.key === "concluido" ? new Date().toISOString() : null;
    } else {
      cleaned.completed_at = null;
    }
  }

  const touchesAssignees = "assignees" in input || "assignee_id" in input;
  let previousTask: { assignee_id: string | null; assignees: string[] | null } | null = null;
  if (touchesAssignees) {
    const { data: existing } = await supabase
      .from("tasks")
      .select("assignee_id, assignees")
      .eq("id", id)
      .maybeSingle();
    previousTask = existing;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(cleaned)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: { _form: [error.message] } };

  if (touchesAssignees) {
    const oldSet = new Set(
      [...(previousTask?.assignees ?? []), previousTask?.assignee_id].filter(
        (v): v is string => Boolean(v),
      ),
    );
    const newSet = [...new Set([...(data.assignees ?? []), data.assignee_id].filter(
      (v): v is string => Boolean(v),
    ))];
    const newlyAdded = newSet.filter((assigneeId) => !oldSet.has(assigneeId));
    console.log("[updateTaskAction] antes de criar notificações, oldSet/newSet/newlyAdded:", {
      oldSet: [...oldSet],
      newSet,
      newlyAdded,
    });
    await notifyNewAssignees(data.id, data.title, data.list_id, newlyAdded);
    console.log("[updateTaskAction] depois de criar notificações");
  } else {
    console.log("[updateTaskAction] update não mexeu em assignees/assignee_id — não verifica notificações");
  }

  revalidatePath("/tarefas");
  return { data };
}

export async function moveTaskStatusAction(id: string, newStatusId: string) {
  const supabase = await createClient();

  const { data: targetStatus } = await supabase
    .from("task_statuses")
    .select("key")
    .eq("id", newStatusId)
    .maybeSingle();

  const update: Record<string, unknown> = { status_id: newStatusId };
  update.completed_at =
    targetStatus?.key === "concluido" ? new Date().toISOString() : null;

  const { error } = await supabase.from("tasks").update(update).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { success: true };
}

export async function deleteTaskAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { success: true };
}

export async function postTaskCommentAction(taskId: string, body: string) {
  if (!body.trim()) return { error: "Comentário vazio" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data, error } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, author_id: user.id, body: body.trim() })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/tarefas/${taskId}`);
  return { data };
}

// Time tracking
export async function startTimerAction(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data, error } = await supabase
    .from("task_time_logs")
    .insert({
      task_id: taskId,
      member_id: user.id,
      start_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { data };
}

export async function stopTimerAction(timeLogId: string) {
  const supabase = await createClient();
  const { data: log } = await supabase
    .from("task_time_logs")
    .select("start_at")
    .eq("id", timeLogId)
    .single();

  if (!log) return { error: "Time log não encontrado" };

  const startAt = new Date((log as { start_at: string }).start_at).getTime();
  const endAt = Date.now();
  const durationMinutes = Math.round((endAt - startAt) / 60000);

  const { error } = await supabase
    .from("task_time_logs")
    .update({
      end_at: new Date(endAt).toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq("id", timeLogId);

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { success: true, durationMinutes };
}

export async function logTimeManualAction(
  taskId: string,
  durationMinutes: number,
  description?: string,
  startISO?: string, // UTC ISO string built on the client
  endISO?: string,   // UTC ISO string built on the client
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  let startAt: Date;
  let endAt: Date;

  if (startISO && endISO) {
    startAt = new Date(startISO);
    endAt = new Date(endISO);
    if (endAt <= startAt) endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
  } else {
    endAt = new Date();
    startAt = new Date(Date.now() - durationMinutes * 60000);
  }

  const actualDuration = Math.round((endAt.getTime() - startAt.getTime()) / 60000) || durationMinutes;

  const { data, error } = await supabase
    .from("task_time_logs")
    .insert({
      task_id: taskId,
      member_id: user.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      duration_minutes: actualDuration,
      is_manual: true,
      description: description ?? null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { data };
}

export async function fetchMyOpenTasksAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };

  const { data: concludedStatus } = await supabase
    .from("task_statuses")
    .select("id")
    .eq("key", "concluido")
    .maybeSingle();

  const SELECT = "id, title, priority, estimate_points";
  const [{ data: byId, error: errById }, { data: byArray, error: errByArray }] = await Promise.all([
    concludedStatus?.id
      ? supabase.from("tasks").select(SELECT).eq("assignee_id", user.id).neq("status_id", concludedStatus.id).is("completed_at", null).order("title")
      : supabase.from("tasks").select(SELECT).eq("assignee_id", user.id).is("completed_at", null).order("title"),
    concludedStatus?.id
      ? supabase.from("tasks").select(SELECT).contains("assignees", [user.id]).neq("status_id", concludedStatus.id).is("completed_at", null).order("title")
      : supabase.from("tasks").select(SELECT).contains("assignees", [user.id]).is("completed_at", null).order("title"),
  ]);

  console.log("[fetchMyOpenTasksAction] user.id:", user.id);
  console.log("[fetchMyOpenTasksAction] concludedStatus:", concludedStatus);
  console.log("[fetchMyOpenTasksAction] byId (assignee_id):", byId?.length ?? 0, "tarefas", errById ? `ERRO: ${errById.message}` : "", byId);
  console.log("[fetchMyOpenTasksAction] byArray (assignees contains):", byArray?.length ?? 0, "tarefas", errByArray ? `ERRO: ${errByArray.message}` : "", byArray);

  const seen = new Set<string>();
  const tasks: { id: string; title: string; priority: TaskPriority; estimate_points: number | null }[] = [];
  for (const t of [...(byId ?? []), ...(byArray ?? [])] as typeof tasks) {
    if (!seen.has(t.id)) { seen.add(t.id); tasks.push(t); }
  }
  return { data: tasks.sort((a, b) => a.title.localeCompare(b.title)) };
}

export async function fetchMyAllTasksAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };

  const SELECT = "id, title, priority, completed_at, estimate_points";
  const [{ data: byId }, { data: byArray }, { data: myTimeLogs }] = await Promise.all([
    supabase.from("tasks").select(SELECT).eq("assignee_id", user.id).order("title"),
    supabase.from("tasks").select(SELECT).contains("assignees", [user.id]).order("title"),
    supabase.from("task_time_logs").select("task_id").eq("member_id", user.id),
  ]);

  const loggedTaskIds = new Set((myTimeLogs ?? []).map((l) => l.task_id));

  const seen = new Set<string>();
  const tasks: { id: string; title: string; priority: TaskPriority; completed_at: string | null; estimate_points: number | null }[] = [];
  for (const t of [...(byId ?? []), ...(byArray ?? [])] as typeof tasks) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    // Excluir tarefas concluídas que já têm pelo menos um registo de tempo deste utilizador
    if (t.completed_at && loggedTaskIds.has(t.id)) continue;
    tasks.push(t);
  }
  return { data: tasks.sort((a, b) => a.title.localeCompare(b.title)) };
}

export async function fetchTaskFormDataAction() {
  const supabase = await createClient();
  const [{ data: statuses }, { data: clients }, { data: members }, { data: spaces }, { data: lists }] =
    await Promise.all([
      supabase.from("task_statuses").select("id, label").eq("active", true).order("sort_order", { ascending: true }),
      supabase.from("clients").select("id, name").order("name", { ascending: true }),
      supabase.from("team_members").select("id, full_name").order("full_name", { ascending: true }),
      supabase.from("task_spaces").select("id, name").order("position", { ascending: true }),
      supabase.from("task_lists").select("id, name, space_id").order("position", { ascending: true }),
    ]);

  const spaceMap = new Map((spaces ?? []).map((s: { id: string; name: string }) => [s.id, s.name]));
  const flatLists = (lists ?? []).map((l: { id: string; name: string; space_id: string }) => ({
    id: l.id,
    name: l.name,
    spaceName: spaceMap.get(l.space_id) ?? undefined,
  }));

  return {
    statuses: (statuses ?? []).map((s: { id: string; label: string }) => ({ id: s.id, label: s.label })),
    clients: (clients ?? []).map((c: { id: string; name: string }) => ({ id: c.id, label: c.name })),
    members: (members ?? []).map((m: { id: string; full_name: string }) => ({ id: m.id, label: m.full_name })),
    lists: flatLists,
  };
}

export async function fetchTaskListsAction() {
  const supabase = await createClient();
  const [{ data: spaces }, { data: lists }] = await Promise.all([
    supabase.from("task_spaces").select("id, name").order("position", { ascending: true }),
    supabase.from("task_lists").select("id, name, space_id").order("position", { ascending: true }),
  ]);
  const spaceMap = new Map((spaces ?? []).map((s: { id: string; name: string }) => [s.id, s.name]));
  const grouped = new Map<string, { spaceId: string; spaceName: string; lists: { id: string; name: string }[] }>();
  for (const l of (lists ?? []) as { id: string; name: string; space_id: string }[]) {
    if (!grouped.has(l.space_id)) {
      grouped.set(l.space_id, { spaceId: l.space_id, spaceName: spaceMap.get(l.space_id) ?? l.space_id, lists: [] });
    }
    grouped.get(l.space_id)!.lists.push({ id: l.id, name: l.name });
  }
  return { data: [...grouped.values()] };
}

export async function getTaskTimeLogsAction(taskId: string) {
  return getTaskTimeLogs(taskId);
}

export async function getTaskActivityAction(taskId: string) {
  return getActivityForTask(taskId);
}

// Hierarchy actions

export async function createTaskSpaceAction(
  name: string,
  color: string = "#6366f1",
  isPrivate: boolean = false
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error, data } = await supabase
    .from("task_spaces")
    .insert({
      name,
      color,
      is_private: isPrivate,
      owner_id: isPrivate ? user?.id : null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { data };
}

export async function createTaskListAction(spaceId: string, name: string, color: string = "#8b5cf6") {
  const supabase = await createClient();
  const { error, data } = await supabase
    .from("task_lists")
    .insert({ space_id: spaceId, name, color })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { data };
}

export async function createSubtaskAction(parentTaskId: string, title: string) {
  const parsed = taskSchema.safeParse({ title });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  // Buscar tarefa pai para obter list_id
  const { data: parentTask } = await supabase
    .from("tasks")
    .select("list_id")
    .eq("id", parentTaskId)
    .single();

  if (!parentTask) return { error: { _form: ["Tarefa pai não encontrada"] } };

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      parent_task_id: parentTaskId,
      list_id: parentTask.list_id,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/tarefas");
  return { data };
}

// Dependências entre tarefas

const dependencyTypeSchema = z.enum(["blocks", "blocked_by", "related"]);

export async function addTaskDependencyAction(
  taskId: string,
  dependsOnId: string,
  type: "blocks" | "blocked_by" | "related",
) {
  const parsedType = dependencyTypeSchema.safeParse(type);
  if (!parsedType.success) return { error: "Tipo de dependência inválido" };
  if (taskId === dependsOnId) return { error: "Uma tarefa não pode depender de si própria" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_dependencies")
    .insert({ task_id: taskId, depends_on_id: dependsOnId, type: parsedType.data })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { data };
}

export async function removeTaskDependencyAction(dependencyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("task_dependencies").delete().eq("id", dependencyId);
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { success: true };
}

export async function getTaskDependenciesAction(taskId: string) {
  return getTaskDependencies(taskId);
}

export async function getTaskDetailAction(taskId: string) {
  const supabase = await createClient();

  const [{ data: task }, { data: comments }] = await Promise.all([
    supabase
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
      .eq("id", taskId)
      .maybeSingle(),
    supabase
      .from("task_comments")
      .select(`*, author:team_members(id, full_name)`)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }),
  ]);

  return { task, comments: comments ?? [] };
}

export async function updateTimeLogAction(
  logId: string,
  taskId: string,
  startISO: string, // UTC ISO string built on the client
  endISO: string,   // UTC ISO string built on the client
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: existing } = await supabase
    .from("task_time_logs")
    .select("member_id")
    .eq("id", logId)
    .single();
  if (!existing || (existing as { member_id: string }).member_id !== user.id) return { error: "Sem permissão" };

  const startAt = new Date(startISO);
  let endAt = new Date(endISO);
  if (endAt <= startAt) endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
  const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60000);

  const { error } = await supabase
    .from("task_time_logs")
    .update({ task_id: taskId, start_at: startAt.toISOString(), end_at: endAt.toISOString(), duration_minutes: durationMinutes })
    .eq("id", logId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteTimeLogAction(logId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: existing } = await supabase
    .from("task_time_logs")
    .select("member_id")
    .eq("id", logId)
    .single();
  if (!existing || (existing as { member_id: string }).member_id !== user.id) return { error: "Sem permissão" };

  const { error } = await supabase.from("task_time_logs").delete().eq("id", logId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getWorkloadAction() {
  const { getWorkloadByMember } = await import("@/lib/queries/tasks");
  return getWorkloadByMember();
}

export async function getTasksForStudentAction(userId: string) {
  const { getTasksForStudent } = await import("@/lib/queries/tasks");
  return getTasksForStudent(userId);
}

export async function updateTaskDeliveryAction(
  taskId: string,
  deliveryUrl: string | null,
) {
  const url = deliveryUrl?.trim() || null;
  if (url) {
    try {
      new URL(url);
    } catch {
      return { error: "URL inválida — certifica-te que começa com https://" };
    }
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ delivery_url: url })
    .eq("id", taskId);
  if (error) return { error: error.message };
  revalidatePath("/incubadora");
  return { success: true };
}

export async function markTaskCompleteAction(taskId: string) {
  const supabase = await createClient();
  const { data: concluido } = await supabase
    .from("task_statuses")
    .select("id")
    .eq("key", "concluido")
    .maybeSingle();
  const update: Record<string, unknown> = {
    completed_at: new Date().toISOString(),
  };
  if (concluido?.id) update.status_id = concluido.id;
  const { error } = await supabase.from("tasks").update(update).eq("id", taskId);
  if (error) return { error: error.message };
  revalidatePath("/incubadora");
  return { success: true };
}

export async function getTasksForGanttAction() {
  const { getTasksForGantt } = await import("@/lib/queries/tasks");
  return getTasksForGantt();
}

export async function getTodayTasksAction(userId: string) {
  const { getTodayTasks } = await import("@/lib/queries/dashboard-colaborador");
  return getTodayTasks(userId);
}

export async function markTaskDoneAction(taskId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: concluido } = await supabase
    .from("task_statuses")
    .select("id")
    .eq("key", "concluido")
    .maybeSingle();

  const update: Record<string, unknown> = {
    completed_at: new Date().toISOString(),
  };
  if (concluido?.id) update.status_id = concluido.id;

  const { error } = await supabase.from("tasks").update(update).eq("id", taskId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

const taskDatesSchema = z.object({
  start_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
});

export async function updateTaskDatesAction(
  taskId: string,
  dates: { start_date?: string | null; due_date?: string | null },
) {
  const parsed = taskDatesSchema.safeParse(dates);
  if (!parsed.success) return { error: "Datas inválidas" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      start_date: parsed.data.start_date ?? null,
      due_date: parsed.data.due_date ?? null,
    })
    .eq("id", taskId);

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { success: true };
}

export async function generateRecurringTasksAction(): Promise<{ success: boolean; generated: number } | { error: string }> {
  const admin = createAdminClient();

  const { data: templates, error: fetchError } = await admin
    .from("tasks")
    .select("*")
    .eq("is_recurring", true)
    .is("recurrence_template_id", null);

  if (fetchError) return { error: fetchError.message };
  if (!templates || templates.length === 0) return { success: true, generated: 0 };

  const { data: aFazerStatus } = await admin
    .from("task_statuses")
    .select("id")
    .eq("key", "a_fazer")
    .maybeSingle();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayDow = today.getUTCDay(); // 0=domingo

  // Intervalo da semana corrente (segunda a domingo)
  const diffToMonday = todayDow === 0 ? 6 : todayDow - 1;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const mondayStr = monday.toISOString().slice(0, 10);
  const sundayStr = sunday.toISOString().slice(0, 10);

  let generated = 0;

  for (const t of templates as Record<string, any>[]) {
    // Não gera se a recorrência já terminou
    if (t.recurrence_end_date && todayStr > t.recurrence_end_date) continue;

    if (t.recurrence_frequency === "daily") {
      const { data: existing } = await admin
        .from("tasks")
        .select("id")
        .eq("recurrence_template_id", t.id)
        .eq("due_date", todayStr)
        .maybeSingle();

      if (!existing) {
        const { error } = await admin.from("tasks").insert({
          title: t.title,
          description: t.description ?? null,
          priority: t.priority,
          assignee_id: t.assignee_id ?? null,
          assignees: t.assignees ?? [],
          estimate_points: t.estimate_points ?? null,
          list_id: t.list_id ?? null,
          status_id: aFazerStatus?.id ?? t.status_id ?? null,
          due_date: todayStr,
          is_recurring: false,
          recurrence_template_id: t.id,
          created_by: t.created_by ?? null,
        });
        if (!error) generated++;
      }
    } else if (t.recurrence_frequency === "weekly") {
      if (t.recurrence_day_of_week === null || t.recurrence_day_of_week !== todayDow) continue;

      const { data: existing } = await admin
        .from("tasks")
        .select("id")
        .eq("recurrence_template_id", t.id)
        .gte("due_date", mondayStr)
        .lte("due_date", sundayStr)
        .maybeSingle();

      if (!existing) {
        const { error } = await admin.from("tasks").insert({
          title: t.title,
          description: t.description ?? null,
          priority: t.priority,
          assignee_id: t.assignee_id ?? null,
          assignees: t.assignees ?? [],
          estimate_points: t.estimate_points ?? null,
          list_id: t.list_id ?? null,
          status_id: aFazerStatus?.id ?? t.status_id ?? null,
          due_date: todayStr,
          is_recurring: false,
          recurrence_template_id: t.id,
          created_by: t.created_by ?? null,
        });
        if (!error) generated++;
      }
    }
  }

  revalidatePath("/tarefas");
  return { success: true, generated };
}
