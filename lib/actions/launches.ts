"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const launchSchema = z.object({
  name: z.string().min(1),
  client_id: z.string().uuid().nullable().optional(),
  status_id: z.string().uuid().nullable().optional(),
  tier: z.string().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export type LaunchInput = z.infer<typeof launchSchema>;

function clean<T extends Record<string, unknown>>(input: T) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    r[k] = v;
  }
  return r;
}

export async function createLaunchAction(input: LaunchInput) {
  const parsed = launchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  // Inserir launch
  const { data: launch, error } = await supabase
    .from("launches")
    .insert({ ...clean(parsed.data), created_by: user.id })
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };

  // Se há template, copiar tarefas (com day_offset relativo a start_date)
  if (parsed.data.template_id) {
    const { data: tplTasks } = await supabase
      .from("launch_template_tasks")
      .select("*")
      .eq("template_id", parsed.data.template_id)
      .order("sort_order");

    if (tplTasks && tplTasks.length > 0) {
      // Status default "a_fazer"
      const { data: defaultStatus } = await supabase
        .from("task_statuses")
        .select("id")
        .eq("key", "a_fazer")
        .maybeSingle();

      const startDate = parsed.data.start_date
        ? new Date(parsed.data.start_date)
        : new Date();

      type TplRow = {
        title: string;
        description: string | null;
        day_offset: number;
        default_priority: string | null;
      };

      const taskRows = (tplTasks as TplRow[]).map((t) => {
        const due = new Date(startDate);
        due.setDate(due.getDate() + (t.day_offset ?? 0));
        return {
          title: t.title,
          description: t.description,
          status_id: (defaultStatus as { id: string } | null)?.id ?? null,
          priority: t.default_priority ?? "sem_prioridade",
          client_id: parsed.data.client_id ?? null,
          launch_id: (launch as { id: string }).id,
          due_date: due.toISOString().slice(0, 10),
          created_by: user.id,
        };
      });

      await supabase.from("tasks").insert(taskRows);
    }
  }

  revalidatePath("/lancamentos");
  return { data: launch };
}

export async function updateLaunchAction(id: string, input: Partial<LaunchInput>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("launches")
    .update(clean(input))
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/lancamentos");
  revalidatePath(`/lancamentos/${id}`);
  return { data };
}

export async function moveLaunchStatusAction(id: string, newStatusId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("launches").update({ status_id: newStatusId }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/lancamentos");
  return { success: true };
}

export async function deleteLaunchAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("launches").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/lancamentos");
  return { success: true };
}

// ─────────── Templates ───────────

const templateSchema = z.object({
  name: z.string().min(1),
  tier: z.string().nullable().optional(),
  duration_days: z.coerce.number().int().nullable().optional(),
  description: z.string().nullable().optional(),
});

const templateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  day_offset: z.coerce.number().int(),
  default_priority: z.enum(["sem_prioridade", "baixa", "media", "alta", "urgente"]).nullable().optional(),
  sort_order: z.coerce.number().int().default(0),
});

export async function createTemplateAction(
  input: z.infer<typeof templateSchema>,
  tasks: z.infer<typeof templateTaskSchema>[],
) {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: tpl, error } = await supabase
    .from("launch_templates")
    .insert(clean(parsed.data))
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };

  if (tasks.length > 0) {
    const rows = tasks.map((t, i) => ({
      ...t,
      sort_order: t.sort_order ?? i,
      template_id: (tpl as { id: string }).id,
    }));
    await supabase.from("launch_template_tasks").insert(rows);
  }

  revalidatePath("/configuracoes");
  return { data: tpl };
}

export async function deleteTemplateAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("launch_templates")
    .update({ active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracoes");
  return { success: true };
}
