"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const processSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  content_md: z.string().nullable().optional(),
  miro_link: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().default(true),
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
  return { data };
}

export async function updateProcessAction(id: string, input: Partial<ProcessInput>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("processes")
    .update(clean(input))
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/processos");
  revalidatePath(`/processos/${id}`);
  return { data };
}

export async function deleteProcessAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("processes").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/processos");
  return { success: true };
}
