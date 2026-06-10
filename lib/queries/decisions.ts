import { createClient } from "@/lib/supabase/server";
import type { Decision } from "@/lib/types";

export interface DecisionWithRelations extends Decision {
  initiative: { id: string; title: string } | null;
  client: { id: string; name: string } | null;
  mentorship: { id: string; name: string } | null;
}

export async function getDecisions(filters?: {
  status?: string;
}): Promise<DecisionWithRelations[]> {
  const supabase = await createClient();
  let q = supabase
    .from("decisions")
    .select(
      `
      *,
      initiative:initiatives(id, title),
      client:clients(id, name),
      mentorship:mentorships(id, name)
      `,
    )
    .order("status")
    .order("impact", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters?.status) q = q.eq("status", filters.status);

  const { data } = await q;
  return (data ?? []) as DecisionWithRelations[];
}

export async function getPendingDecisions(): Promise<DecisionWithRelations[]> {
  return getDecisions({ status: "pendente" });
}

export async function getDecisionById(
  id: string,
): Promise<DecisionWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("decisions")
    .select(
      `
      *,
      initiative:initiatives(id, title),
      client:clients(id, name),
      mentorship:mentorships(id, name)
      `,
    )
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as DecisionWithRelations | null;
}
