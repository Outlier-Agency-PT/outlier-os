"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getKeyResultHistory, type KeyResultHistoryEntry } from "@/lib/queries/okrs";

export async function getKeyResultHistoryAction(krId: string): Promise<KeyResultHistoryEntry[]> {
  return getKeyResultHistory(krId);
}

const objectiveSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  year: z.coerce.number().int(),
  department: z.string().nullable().optional(),
  confidence: z.enum(["baixa", "media", "alta"]).nullable().optional(),
  status: z.string().default("em_progresso"),
  responsible_ids: z.array(z.string().uuid()).optional(),
});

export type ObjectiveInput = z.infer<typeof objectiveSchema>;

function clean<T extends Record<string, unknown>>(input: T) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    r[k] = v;
  }
  return r;
}

export async function createObjectiveAction(input: ObjectiveInput) {
  const parsed = objectiveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data, error } = await supabase
    .from("objectives")
    .insert({ ...clean(parsed.data), created_by: user.id })
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/okrs");
  return { data };
}

export async function deleteObjectiveAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("objectives").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/okrs");
  return { success: true };
}

const krSchema = z.object({
  objective_id: z.string().uuid(),
  title: z.string().min(1),
  initial_value: z.coerce.number().default(0),
  current_value: z.coerce.number().default(0),
  target_value: z.coerce.number(),
  deadline: z.string().nullable().optional(),
  responsible_ids: z.array(z.string().uuid()).optional(),
  sort_order: z.coerce.number().default(0),
});

export async function createKeyResultAction(input: z.infer<typeof krSchema>) {
  const parsed = krSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("key_results")
    .insert(clean(parsed.data))
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/okrs");
  return { data };
}

export async function updateKeyResultProgressAction(id: string, currentValue: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("key_results")
    .update({ current_value: currentValue })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/okrs");
  return { success: true };
}

export async function deleteKeyResultAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("key_results").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/okrs");
  return { success: true };
}
