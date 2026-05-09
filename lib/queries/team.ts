import { createClient } from "@/lib/supabase/server";
import type { TeamMember } from "@/lib/types";

export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as TeamMember[];
}

export async function getCurrentMember(): Promise<TeamMember | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data ?? null) as TeamMember | null;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const member = await getCurrentMember();
  return member?.role === "admin";
}
