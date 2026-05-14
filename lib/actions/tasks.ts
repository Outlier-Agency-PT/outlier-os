"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().nullable().optional(),
  status_id: z.string().uuid().nullable().optional(),
  priority: z.enum(["sem_prioridade", "baixa", "media", "alta", "urgente"]).default("sem_prioridade"),
  client_id: z.string().uuid().nullable().optional(),
  launch_id: z.string().uuid().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;

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

  const { data, error } = await supabase
    .from("tasks")
    .update(cleaned)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/tarefas");
  return { data };
}

export async function moveTaskStatusAction(id: string, newStatusId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status_id: newStatusId })
    .eq("id", id);
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
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const now = new Date();
  const start = new Date(now.getTime() - durationMinutes * 60000);

  const { data, error } = await supabase
    .from("task_time_logs")
    .insert({
      task_id: taskId,
      member_id: user.id,
      start_at: start.toISOString(),
      end_at: now.toISOString(),
      duration_minutes: durationMinutes,
      is_manual: true,
      description: description ?? null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { data };
}
