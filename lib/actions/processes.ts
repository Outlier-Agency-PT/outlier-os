"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateAndSaveEmbedding } from "@/lib/queries/processes";

const DOC_TYPE_VALUES = ["processo", "playbook", "guia", "template", "checklist", "decisao", "trilha"] as const;

export interface DecisionData {
  context: string;
  alternatives: string;
  decided_by_id: string;
  decided_by_name: string;
  decided_at: string; // ISO date string
  impact: string;
}

const processSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  doc_type: z.enum(DOC_TYPE_VALUES).default("processo"),
  category_id: z.string().uuid().nullable().optional(),
  content_md: z.string().nullable().optional(),
  miro_link: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().default(true),
  decision_data: z.object({
    context: z.string().min(1),
    alternatives: z.string().min(1),
    decided_by_id: z.string(),
    decided_by_name: z.string(),
    decided_at: z.string(),
    impact: z.string().min(1),
  }).nullable().optional(),
  version: z.string().nullable().optional(),
  last_reviewed_at: z.string().nullable().optional(),
  template_target: z.enum(["processo", "briefing", "tarefas"]).nullable().optional(),
});

export type ProcessInput = z.infer<typeof processSchema>;

function clean<T extends Record<string, unknown>>(input: T) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    r[k] = v;
  }
  return r;
}

export async function createProcessAction(input: ProcessInput) {
  const parsed = processSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data, error } = await supabase
    .from("processes")
    .insert({ ...clean(parsed.data), created_by: user.id })
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/processos");
  // Fire-and-forget: generate embedding after save; never blocks the response
  if (data?.id) generateAndSaveEmbedding(data.id).catch(() => {});
  return { data };
}

export async function updateProcessAction(
  id: string,
  input: Partial<ProcessInput>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { errors: ["Não autenticado"] };

  const [{ data: member }, { data: process }] = await Promise.all([
    supabase
      .from("team_members")
      .select("role")
      .eq("id", user.id)
      .eq("active", true)
      .single(),
    supabase
      .from("processes")
      .select("created_by")
      .eq("id", id)
      .single(),
  ]);

  const isAdmin = member?.role === "admin";
  const isOwner = process?.created_by === user.id;
  if (!isAdmin && !isOwner) return { errors: ["Sem permissão"] };

  const { data, error } = await supabase
    .from("processes")
    .update(clean(input))
    .eq("id", id)
    .select()
    .single();

  if (error) return { errors: [error.message] };
  revalidatePath("/processos");
  revalidatePath(`/processos/${id}`);
  // Fire-and-forget: regenerate embedding after update; never blocks the response
  generateAndSaveEmbedding(id).catch(() => {});
  return { data };
}

export async function deleteProcessAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const [{ data: member }, { data: process }] = await Promise.all([
    supabase.from("team_members").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("processes").select("created_by").eq("id", id).single(),
  ]);

  const isAdmin = member?.role === "admin";
  const isOwner = process?.created_by === user.id;
  if (!isAdmin && !isOwner) return { error: "Sem permissão" };

  const { error } = await supabase.from("processes").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/processos");
  return { success: true };
}
