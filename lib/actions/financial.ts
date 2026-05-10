"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const transactionSchema = z.object({
  type: z.enum(["receita", "despesa"]),
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  category_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  transaction_date: z.string(),
  notes: z.string().nullable().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

function clean<T extends Record<string, unknown>>(input: T) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    r[k] = v;
  }
  return r;
}

export async function createTransactionAction(input: TransactionInput) {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...clean(parsed.data), created_by: user.id })
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/financeiro");
  return { data };
}

export async function deleteTransactionAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { success: true };
}

const recurringSchema = z.object({
  type: z.enum(["receita", "despesa"]),
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  category_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  frequency: z.enum(["mensal", "trimestral", "semestral", "anual"]).default("mensal"),
  day_of_month: z.coerce.number().int().min(1).max(28),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
});

export async function createRecurringAction(input: z.infer<typeof recurringSchema>) {
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_transactions")
    .insert(clean(parsed.data))
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/financeiro");
  return { data };
}

export async function deleteRecurringAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_transactions").update({ active: false }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { success: true };
}

// Gera transações do mês atual a partir das recorrentes activas
export async function generateRecurringForMonthAction(year: number, month: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: recurrings } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("active", true);

  if (!recurrings || recurrings.length === 0) return { success: true, generated: 0 };

  type R = {
    id: string;
    type: "receita" | "despesa";
    amount: number;
    description: string;
    category_id: string | null;
    client_id: string | null;
    day_of_month: number;
    start_date: string;
    end_date: string | null;
    last_generated_date: string | null;
  };

  let generated = 0;
  for (const r of recurrings as R[]) {
    const transactionDate = new Date(year, month - 1, r.day_of_month);
    const dateStr = transactionDate.toISOString().slice(0, 10);

    if (new Date(r.start_date) > transactionDate) continue;
    if (r.end_date && new Date(r.end_date) < transactionDate) continue;
    if (r.last_generated_date && r.last_generated_date >= dateStr) continue;

    const { error } = await supabase.from("transactions").insert({
      type: r.type,
      amount: r.amount,
      description: `${r.description} (auto)`,
      category_id: r.category_id,
      client_id: r.client_id,
      transaction_date: dateStr,
      recurring_id: r.id,
      created_by: user.id,
    });
    if (!error) {
      generated++;
      await supabase
        .from("recurring_transactions")
        .update({ last_generated_date: dateStr })
        .eq("id", r.id);
    }
  }

  revalidatePath("/financeiro");
  return { success: true, generated };
}
