import { createClient } from "@/lib/supabase/server";
import { toWeekStart, getCurrentWeekStart } from "@/lib/utils/week";

export { toWeekStart, getCurrentWeekStart };

export interface WeeklyCheckpoint {
  id: string;
  member_id: string;
  week_start: string;
  positive: string;
  achievements: string;
  challenges: string;
  improvements: string;
  created_at: string;
  updated_at: string;
}

export interface CheckpointWithMember extends WeeklyCheckpoint {
  member: { id: string; full_name: string } | null;
}

export interface MemberCheckpointStatus {
  id: string;
  full_name: string;
  submitted: boolean;
  checkpoint: WeeklyCheckpoint | null;
}

export async function getMyCheckpoints(memberId: string): Promise<WeeklyCheckpoint[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("weekly_checkpoints")
    .select("*")
    .eq("member_id", memberId)
    .order("week_start", { ascending: false });
  return (data ?? []) as WeeklyCheckpoint[];
}

export async function getThisWeekCheckpoint(memberId: string): Promise<WeeklyCheckpoint | null> {
  const supabase = await createClient();
  const weekStart = getCurrentWeekStart();
  const { data } = await supabase
    .from("weekly_checkpoints")
    .select("*")
    .eq("member_id", memberId)
    .eq("week_start", weekStart)
    .maybeSingle();
  return data as WeeklyCheckpoint | null;
}

export async function getWeeklyCheckpoints(weekStart: string): Promise<CheckpointWithMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("weekly_checkpoints")
    .select("*, member:team_members(id, full_name)")
    .eq("week_start", weekStart)
    .order("created_at", { ascending: true });
  return (data ?? []) as CheckpointWithMember[];
}

export async function getCheckpointStatus(weekStart: string): Promise<MemberCheckpointStatus[]> {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("team_members")
    .select("id, full_name")
    .eq("active", true)
    .neq("role", "aluno")
    .order("full_name", { ascending: true });

  if (!members || members.length === 0) return [];

  const { data: checkpoints } = await supabase
    .from("weekly_checkpoints")
    .select("*")
    .eq("week_start", weekStart);

  const cpMap = new Map<string, WeeklyCheckpoint>(
    ((checkpoints ?? []) as WeeklyCheckpoint[]).map((c) => [c.member_id, c]),
  );

  return (members as { id: string; full_name: string }[]).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    submitted: cpMap.has(m.id),
    checkpoint: cpMap.get(m.id) ?? null,
  }));
}
