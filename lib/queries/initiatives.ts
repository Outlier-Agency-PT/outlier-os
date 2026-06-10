import { createClient } from "@/lib/supabase/server";
import type { Initiative, InitiativeUpdate } from "@/lib/types";

export interface InitiativeWithRelations extends Initiative {
  owner: { id: string; full_name: string; email: string } | null;
  client: { id: string; name: string } | null;
  mentorship: { id: string; name: string } | null;
}

export async function getInitiatives(filters?: {
  status?: string;
  focus?: boolean;
  needsDecision?: boolean;
}): Promise<InitiativeWithRelations[]> {
  const supabase = await createClient();
  let q = supabase
    .from("initiatives")
    .select(
      `
      *,
      owner:team_members!initiatives_owner_id_fkey(id, full_name, email),
      client:clients(id, name),
      mentorship:mentorships(id, name)
      `,
    )
    .order("updated_at", { ascending: false });

  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.focus) q = q.eq("focus_this_week", true);
  if (filters?.needsDecision) q = q.eq("needs_decision", true);

  const { data } = await q;
  return (data ?? []) as InitiativeWithRelations[];
}

export async function getInitiativeById(
  id: string,
): Promise<InitiativeWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("initiatives")
    .select(
      `
      *,
      owner:team_members!initiatives_owner_id_fkey(id, full_name, email),
      client:clients(id, name),
      mentorship:mentorships(id, name)
      `,
    )
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as InitiativeWithRelations | null;
}

export async function getInitiativeUpdates(
  initiativeId: string,
): Promise<InitiativeUpdate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("initiative_updates")
    .select("*")
    .eq("initiative_id", initiativeId)
    .order("created_at", { ascending: false });
  return (data ?? []) as InitiativeUpdate[];
}

export async function getInitiativeStats(): Promise<{
  total: number;
  emCurso: number;
  emPausa: number;
  focusThisWeek: number;
  needsDecision: number;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("initiatives")
    .select("status, focus_this_week, needs_decision")
    .is("archived_at", null);

  const rows = (data ?? []) as Array<{
    status: string;
    focus_this_week: boolean;
    needs_decision: boolean;
  }>;

  return {
    total: rows.length,
    emCurso: rows.filter((r) => r.status === "em_curso").length,
    emPausa: rows.filter((r) => r.status === "em_pausa").length,
    focusThisWeek: rows.filter((r) => r.focus_this_week).length,
    needsDecision: rows.filter((r) => r.needs_decision).length,
  };
}
