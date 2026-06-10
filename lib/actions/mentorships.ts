"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const mentorshipSchema = z.object({
  name: z.string().min(1),
  mentor: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  status: z.enum(["ativa", "em_pausa", "concluida", "arquivada"]).default("ativa"),
  total_modules: z.coerce.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  cover_emoji: z.string().default("🎓"),
});

export type MentorshipInput = z.infer<typeof mentorshipSchema>;

function clean<T extends Record<string, unknown>>(input: T) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    r[k] = v;
  }
  return r;
}

export async function createMentorshipAction(input: MentorshipInput) {
  const parsed = mentorshipSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data, error } = await supabase
    .from("mentorships")
    .insert({ ...clean(parsed.data), created_by: user.id })
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/mentorias");
  return { data };
}

export async function createModuleAction(input: {
  mentorship_id: string;
  title: string;
  order_index: number;
  duration_minutes?: number | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mentorship_modules")
    .insert(input)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/mentorias/${input.mentorship_id}`);
  return { data };
}

export async function markModuleConsumedAction(id: string, mentorshipId: string, insights?: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("mentorship_modules")
    .update({
      consumed_at: new Date().toISOString(),
      key_insights: insights ?? null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/mentorias/${mentorshipId}`);
  return { success: true };
}

export async function createActionAction(input: {
  mentorship_id: string;
  module_id?: string | null;
  action: string;
  why?: string | null;
  priority?: "sem_prioridade" | "baixa" | "media" | "alta" | "urgente";
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("implementation_actions")
    .insert({
      mentorship_id: input.mentorship_id,
      module_id: input.module_id ?? null,
      action: input.action,
      why: input.why ?? null,
      priority: input.priority ?? "media",
      created_by: user?.id,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/mentorias/${input.mentorship_id}`);
  return { data };
}

export async function updateActionStatusAction(
  id: string,
  mentorshipId: string,
  status: "pendente" | "a_implementar" | "em_curso" | "implementado" | "parqueada",
) {
  const supabase = await createClient();
  const done_at = status === "implementado" ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("implementation_actions")
    .update({ status, done_at })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/mentorias/${mentorshipId}`);
  return { success: true };
}
