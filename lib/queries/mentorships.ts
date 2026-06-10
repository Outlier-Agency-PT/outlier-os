import { createClient } from "@/lib/supabase/server";
import type {
  Mentorship,
  MentorshipModule,
  ImplementationAction,
} from "@/lib/types";

export interface MentorshipWithStats extends Mentorship {
  modules_count: number;
  modules_consumed: number;
  actions_total: number;
  actions_implemented: number;
}

export async function getMentorships(): Promise<MentorshipWithStats[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mentorships")
    .select("*")
    .order("status", { ascending: true })
    .order("name");

  const mentorships = (data ?? []) as Mentorship[];
  if (mentorships.length === 0) return [];

  // Stats em batch
  const ids = mentorships.map((m) => m.id);
  const { data: modulesData } = await supabase
    .from("mentorship_modules")
    .select("mentorship_id, consumed_at")
    .in("mentorship_id", ids);
  const { data: actionsData } = await supabase
    .from("implementation_actions")
    .select("mentorship_id, status")
    .in("mentorship_id", ids);

  const moduleByMent: Record<string, { total: number; consumed: number }> = {};
  (modulesData ?? []).forEach((m: { mentorship_id: string; consumed_at: string | null }) => {
    if (!moduleByMent[m.mentorship_id]) moduleByMent[m.mentorship_id] = { total: 0, consumed: 0 };
    moduleByMent[m.mentorship_id].total++;
    if (m.consumed_at) moduleByMent[m.mentorship_id].consumed++;
  });
  const actionByMent: Record<string, { total: number; implemented: number }> = {};
  (actionsData ?? []).forEach((a: { mentorship_id: string; status: string }) => {
    if (!actionByMent[a.mentorship_id]) actionByMent[a.mentorship_id] = { total: 0, implemented: 0 };
    actionByMent[a.mentorship_id].total++;
    if (a.status === "implementado") actionByMent[a.mentorship_id].implemented++;
  });

  return mentorships.map((m) => ({
    ...m,
    modules_count: moduleByMent[m.id]?.total ?? 0,
    modules_consumed: moduleByMent[m.id]?.consumed ?? 0,
    actions_total: actionByMent[m.id]?.total ?? 0,
    actions_implemented: actionByMent[m.id]?.implemented ?? 0,
  }));
}

export async function getMentorshipById(id: string): Promise<Mentorship | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mentorships")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as Mentorship | null;
}

export async function getMentorshipModules(
  mentorshipId: string,
): Promise<MentorshipModule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mentorship_modules")
    .select("*")
    .eq("mentorship_id", mentorshipId)
    .order("order_index");
  return (data ?? []) as MentorshipModule[];
}

export async function getImplementationActions(
  mentorshipId: string,
): Promise<ImplementationAction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("implementation_actions")
    .select("*")
    .eq("mentorship_id", mentorshipId)
    .order("status")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as ImplementationAction[];
}
