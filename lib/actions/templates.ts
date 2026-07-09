"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getTaskTemplate } from "@/lib/queries/templates";

// ============================================================
// Schemas
// ============================================================

const priorityEnum = z.enum(["sem_prioridade", "baixa", "media", "alta", "urgente"]);

const childItemSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().nullable().optional(),
  priority: priorityEnum.default("media"),
  estimate_points: z.number().nullable().optional(),
  sort_order: z.number().default(0),
  default_assignee_id: z.string().uuid().nullable().optional(),
  day_offset: z.number().int().min(0).default(0),
  default_status_id: z.string().uuid().nullable().optional(),
});

const templateItemSchema = childItemSchema.extend({
  children: z.array(childItemSchema).optional().default([]),
});

const createTemplateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().nullable().optional(),
  space_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  items: z.array(templateItemSchema).min(1, "Adiciona pelo menos uma tarefa"),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

// ============================================================
// AppliedItem — usado no applyTaskTemplateAction
// ============================================================

export interface AppliedItem {
  template_item_id: string;
  title: string;
  assignee_id: string | null;
  due_date: string | null;
  status_id: string | null;
  priority: string;
  estimate_points: number | null;
  parent_template_item_id: string | null;
}

// ============================================================
// createTaskTemplateAction
// ============================================================

export async function createTaskTemplateAction(input: CreateTemplateInput) {
  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data: template, error: templateError } = await supabase
    .from("task_templates")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      space_id: parsed.data.space_id ?? null,
      category_id: parsed.data.category_id ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (templateError) return { error: { _form: [templateError.message] } };

  type ItemRow = {
    template_id: string;
    parent_item_id: string | null;
    title: string;
    description: string | null;
    priority: string;
    estimate_points: number | null;
    sort_order: number;
    default_assignee_id: string | null;
    day_offset: number;
    default_status_id: string | null;
  };

  const rootRows: ItemRow[] = parsed.data.items.map((item, i) => ({
    template_id: template.id,
    parent_item_id: null,
    title: item.title,
    description: item.description ?? null,
    priority: item.priority,
    estimate_points: item.estimate_points ?? null,
    sort_order: i,
    default_assignee_id: item.default_assignee_id ?? null,
    day_offset: item.day_offset ?? 0,
    default_status_id: item.default_status_id ?? null,
  }));

  const { data: insertedRoots, error: rootError } = await supabase
    .from("task_template_items")
    .insert(rootRows)
    .select("id, sort_order");

  if (rootError) return { error: { _form: [rootError.message] } };

  const childRows: ItemRow[] = [];
  for (const [i, item] of parsed.data.items.entries()) {
    const parentId = insertedRoots.find((r) => r.sort_order === i)?.id;
    if (!parentId || !item.children?.length) continue;

    for (const [j, child] of item.children.entries()) {
      childRows.push({
        template_id: template.id,
        parent_item_id: parentId,
        title: child.title,
        description: child.description ?? null,
        priority: child.priority,
        estimate_points: child.estimate_points ?? null,
        sort_order: j,
        default_assignee_id: child.default_assignee_id ?? null,
        day_offset: child.day_offset ?? 0,
        default_status_id: child.default_status_id ?? null,
      });
    }
  }

  if (childRows.length > 0) {
    const { error: childError } = await supabase
      .from("task_template_items")
      .insert(childRows);
    if (childError) return { error: { _form: [childError.message] } };
  }

  revalidatePath("/tarefas/templates");
  return { data: template };
}

// ============================================================
// deleteTaskTemplateAction
// ============================================================

export async function deleteTaskTemplateAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("task_templates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/tarefas/templates");
  return { success: true };
}

// ============================================================
// duplicateTaskTemplateAction
// ============================================================

export async function duplicateTaskTemplateAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const original = await getTaskTemplate(id);
  if (!original) return { error: "Template não encontrado" };

  const { data: newTemplate, error: tplError } = await supabase
    .from("task_templates")
    .insert({
      name: `${original.name} (cópia)`,
      description: original.description ?? null,
      space_id: original.space_id ?? null,
      category_id: original.category_id ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (tplError) return { error: tplError.message };

  if (original.items.length === 0) {
    revalidatePath("/tarefas/templates");
    return { data: { id: newTemplate.id } };
  }

  const rootRows = original.items.map((root, i) => ({
    template_id: newTemplate.id,
    parent_item_id: null,
    title: root.title,
    description: root.description ?? null,
    priority: root.priority,
    estimate_points: root.estimate_points ?? null,
    sort_order: i,
    default_assignee_id: root.default_assignee_id ?? null,
    day_offset: root.day_offset ?? 0,
    default_status_id: root.default_status_id ?? null,
  }));

  const { data: insertedRoots, error: rootErr } = await supabase
    .from("task_template_items")
    .insert(rootRows)
    .select("id, sort_order");

  if (rootErr) return { error: rootErr.message };

  // Map original root id → new id via sort_order
  const rootIdMap = new Map<string, string>();
  original.items.forEach((root, i) => {
    const inserted = insertedRoots.find((r) => r.sort_order === i);
    if (inserted) rootIdMap.set(root.id, inserted.id);
  });

  const childRows = original.items.flatMap((root) =>
    root.children.map((child, j) => ({
      template_id: newTemplate.id,
      parent_item_id: rootIdMap.get(root.id) ?? null,
      title: child.title,
      description: child.description ?? null,
      priority: child.priority,
      estimate_points: child.estimate_points ?? null,
      sort_order: j,
      default_assignee_id: child.default_assignee_id ?? null,
      day_offset: child.day_offset ?? 0,
      default_status_id: child.default_status_id ?? null,
    })),
  );

  if (childRows.length > 0) {
    const { error: childErr } = await supabase
      .from("task_template_items")
      .insert(childRows);
    if (childErr) return { error: childErr.message };
  }

  revalidatePath("/tarefas/templates");
  return { data: { id: newTemplate.id } };
}

// ============================================================
// applyTaskTemplateAction
// ============================================================

export async function applyTaskTemplateAction(
  templateId: string,
  appliedItems: AppliedItem[],
  targetListId: string,
): Promise<{ tasksCreated?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  if (!appliedItems.length) return { error: "Nenhuma tarefa para criar" };

  const roots = appliedItems.filter((i) => !i.parent_template_item_id);
  const children = appliedItems.filter((i) => i.parent_template_item_id);

  // Map template_item_id → created task id
  const taskIdMap = new Map<string, string>();
  let tasksCreated = 0;

  for (const root of roots) {
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        title: root.title,
        priority: root.priority,
        estimate_points: root.estimate_points ?? null,
        list_id: targetListId,
        status_id: root.status_id ?? null,
        due_date: root.due_date ?? null,
        assignees: root.assignee_id ? [root.assignee_id] : [],
        assignee_id: root.assignee_id ?? null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    taskIdMap.set(root.template_item_id, task.id);
    tasksCreated++;
  }

  for (const child of children) {
    const parentTaskId = child.parent_template_item_id
      ? taskIdMap.get(child.parent_template_item_id) ?? null
      : null;

    const { error } = await supabase.from("tasks").insert({
      title: child.title,
      priority: child.priority,
      estimate_points: child.estimate_points ?? null,
      list_id: targetListId,
      status_id: child.status_id ?? null,
      due_date: child.due_date ?? null,
      parent_task_id: parentTaskId,
      assignees: child.assignee_id ? [child.assignee_id] : [],
      assignee_id: child.assignee_id ?? null,
      created_by: user.id,
    });

    if (error) return { error: error.message };
    tasksCreated++;
  }

  revalidatePath("/tarefas");
  return { tasksCreated };
}
