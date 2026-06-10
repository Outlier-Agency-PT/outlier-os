"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const decisionSchema = z.object({
  title: z.string().min(1),
  context: z.string().nullable().optional(),
  options: z.string().nullable().optional(),
  status: z.enum(["pendente", "decidida", "adiada", "arquivada"]).default("pendente"),
  impact: z.enum(["baixo", "medio", "alto", "critico"]).nullable().optional(),
  urgency: z.string().nullable().optional(),
  initiative_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  mentorship_id: z.string().uuid().nullable().optional(),
});

export type DecisionInput = z.infer<typeof decisionSchema>;

function clean<T extends Record<string, unknown>>(input: T) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    r[k] = v;
  }
  return r;
}

export async function createDecisionAction(input: DecisionInput) {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data, error } = await supabase
    .from("decisions")
    .insert({ ...clean(parsed.data), created_by: user.id })
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/decisoes");
  return { data };
}

export async function recordDecisionAction(id: string, decision: string) {
  if (!decision.trim()) return { error: "Decisão vazia" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("decisions")
    .update({
      status: "decidida",
      decision: decision.trim(),
      decided_by: user?.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/decisoes");
  return { success: true };
}

export async function deleteDecisionAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("decisions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/decisoes");
  return { success: true };
}
