import { createClient } from "@/lib/supabase/server";

export interface Report {
  id: string;
  client_id: string;
  type: "semanal" | "mensal";
  status: "rascunho" | "publicado";
  period_start: string;
  period_end: string;
  kpis: Record<string, number>;
  content_md: string | null;
  published_at: string | null;
  created_at: string;
  client: { id: string; name: string } | null;
}

export async function getReports(): Promise<Report[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(`*, client:clients(id, name)`)
    .order("period_end", { ascending: false });
  return (data ?? []) as Report[];
}

export async function getReportById(id: string): Promise<Report | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(`*, client:clients(id, name)`)
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as Report | null;
}
