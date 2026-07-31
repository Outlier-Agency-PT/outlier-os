"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Process } from "@/lib/queries/processes";

export async function useTemplateAsProcessAction(
  template: Process,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data, error } = await supabase
    .from("processes")
    .insert({
      title: `[Cópia] ${template.title}`,
      description: template.description,
      content_md: template.content_md,
      doc_type: "processo",
      category_id: template.category_id,
      tags: template.tags,
      published: false,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/processos");
  return { id: data.id };
}

export async function useTemplateAsTasksAction(
  templateId: string,
  contentMd: string,
  options: {
    listId: string;
    assigneeId?: string;
    dueDate?: string;
  },
): Promise<{ count: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const items = contentMd
    .split("\n")
    .filter((l) => /^[-*]\s+.+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);

  if (items.length === 0) {
    return { error: "O template não tem itens de lista (- item)." };
  }

  const errors: string[] = [];
  let count = 0;

  for (const title of items) {
    const { error } = await supabase.from("tasks").insert({
      title,
      list_id: options.listId,
      assignee_id: options.assigneeId ?? null,
      assignees: options.assigneeId ? [options.assigneeId] : [],
      due_date: options.dueDate ?? null,
      created_by: user.id,
    });
    if (error) errors.push(error.message);
    else count++;
  }

  if (count === 0) return { error: errors[0] ?? "Erro ao criar tarefas." };

  revalidatePath("/tarefas");
  return { count };
}
