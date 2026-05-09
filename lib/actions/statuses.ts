"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

type StatusTable =
  | "client_statuses"
  | "task_statuses"
  | "launch_statuses"
  | "content_statuses";

const statusSchema = z.object({
  key: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, "Apenas minúsculas, números e _"),
  label: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor hex válida"),
  sort_order: z.coerce.number().int().nonnegative(),
});

const updateSchema = statusSchema.partial().extend({ active: z.boolean().optional() });

export async function createStatusAction(table: StatusTable, input: z.infer<typeof statusSchema>) {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.from(table).insert(parsed.data).select().single();
  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/configuracoes");
  return { data };
}

export async function updateStatusAction(
  table: StatusTable,
  id: string,
  input: z.infer<typeof updateSchema>,
) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/configuracoes");
  return { data };
}

export async function deleteStatusAction(table: StatusTable, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(table).update({ active: false }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracoes");
  return { success: true };
}
