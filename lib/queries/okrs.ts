import { createClient } from "@/lib/supabase/server";

export interface KeyResultHistoryEntry {
  id: string;
  value: number;
  recorded_at: string;
  recorded_by: string | null;
  recorded_by_name: string | null;
}

export interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  initial_value: number;
  current_value: number;
  target_value: number;
  deadline: string | null;
  responsible_ids: string[] | null;
  sort_order: number;
}

export interface Objective {
  id: string;
  title: string;
  description: string | null;
  quarter: string;
  year: number;
  department: string | null;
  confidence: "baixa" | "media" | "alta" | null;
  status: string;
  responsible_ids: string[] | null;
  created_at: string;
  key_results: KeyResult[];
  progress: number;
}

export async function getObjectives(filters?: {
  quarter?: string;
  year?: number;
  department?: string;
}): Promise<Objective[]> {
  const supabase = await createClient();
  let q = supabase
    .from("objectives")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.quarter) q = q.eq("quarter", filters.quarter);
  if (filters?.year) q = q.eq("year", filters.year);
  if (filters?.department) q = q.eq("department", filters.department);

  const { data: objectives } = await q;
  if (!objectives) return [];

  // Buscar todos os key_results
  const { data: krs } = await supabase
    .from("key_results")
    .select("*")
    .in(
      "objective_id",
      (objectives as { id: string }[]).map((o) => o.id),
    );

  type ObjRow = Omit<Objective, "key_results" | "progress">;
  return (objectives as ObjRow[]).map((o) => {
    const myKrs = ((krs ?? []) as KeyResult[]).filter((k) => k.objective_id === o.id);
    let totalProgress = 0;
    for (const kr of myKrs) {
      const range = kr.target_value - kr.initial_value;
      if (range === 0) continue;
      const p = ((kr.current_value - kr.initial_value) / range) * 100;
      totalProgress += Math.max(0, Math.min(100, p));
    }
    const progress = myKrs.length > 0 ? totalProgress / myKrs.length : 0;

    return {
      ...o,
      key_results: myKrs.sort((a, b) => a.sort_order - b.sort_order),
      progress,
    };
  });
}

export async function getKeyResultHistory(krId: string): Promise<KeyResultHistoryEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("key_result_history")
    .select("id, value, recorded_at, recorded_by, team_members(full_name)")
    .eq("key_result_id", krId)
    .order("recorded_at", { ascending: true });

  if (!data) return [];

  return (data as any[]).map((row) => ({
    id: row.id as string,
    value: row.value as number,
    recorded_at: row.recorded_at as string,
    recorded_by: row.recorded_by as string | null,
    recorded_by_name:
      (row.team_members as { full_name: string } | null)?.full_name ?? null,
  }));
}
