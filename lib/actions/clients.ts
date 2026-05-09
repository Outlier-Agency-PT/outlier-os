"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  client_type: z.enum(["one_shot", "long_term", "interno"]),
  status_id: z.string().uuid().nullable().optional(),
  responsible_id: z.string().uuid().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  monthly_value: z.coerce.number().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;

function cleanInput(input: ClientInput) {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    cleaned[k] = v;
  }
  return cleaned;
}

export async function createClientAction(input: ClientInput) {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...cleanInput(parsed.data), created_by: user.id })
    .select()
    .single();

  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/clientes");
  return { data };
}

export async function updateClientAction(id: string, input: ClientInput) {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(cleanInput(parsed.data))
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { data };
}

export async function deleteClientAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  return { success: true };
}

export async function togglePublicShareAction(id: string, enabled: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ public_share_enabled: enabled })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${id}`);
  return { success: true };
}
