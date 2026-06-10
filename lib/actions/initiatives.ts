"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const initiativeSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(["ideia", "planeamento", "em_curso", "em_pausa", "concluida", "cancelada"]).default("ideia"),
  priority: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
  source: z.enum(["interno", "cliente", "mentoria", "oportunidade", "crise"]).default("interno"),
  health: z.enum(["verde", "amarelo", "vermelho"]).nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  next_step: z.string().nullable().optional(),
  blocker: z.string().nullable().optional(),
  focus_this_week: z.boolean().default(false),
  needs_decision: z.boolean().default(false),
  decision_context: z.string().nullable().optional(),
  expected_impact: z.string().nullable().optional(),
  expected_effort: z.string().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  mentorship_id: z.string().uuid().nullable().optional(),
  parent_initiative_id: z.string().uuid().nullable().optional(),
  start_date: z.string().nullable().optional(),
  target_date: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

export type InitiativeInput = z.infer<typeof initiativeSchema>;

function clean<T extends Record<string, unknown>>(input: T) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    r[k] = v;
  }
  return r;
}

export async function createInitiativeAction(input: InitiativeInput) {
  const parsed = initiativeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data, error } = await supabase
    .from("initiatives")
    .insert({ ...clean(parsed.data), created_by: user.id })
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/iniciativas");
  return { data };
}

export async function updateInitiativeAction(id: string, input: Partial<InitiativeInput>) {
  const supabase = await createClient();
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    cleaned[k] = v === "" ? null : v;
  }
  const { data, error } = await supabase
    .from("initiatives")
    .update(cleaned)
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath("/iniciativas");
  revalidatePath(`/iniciativas/${id}`);
  return { data };
}

export async function deleteInitiativeAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("initiatives").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/iniciativas");
  return { success: true };
}

export async function postInitiativeUpdateAction(initiativeId: string, content: string) {
  if (!content.trim()) return { error: "Vazio" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("initiative_updates")
    .insert({ initiative_id: initiativeId, content: content.trim(), author_id: user?.id })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/iniciativas/${initiativeId}`);
  return { data };
}

export async function toggleFocusAction(id: string, focus: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("initiatives")
    .update({ focus_this_week: focus })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/iniciativas");
  return { success: true };
}
