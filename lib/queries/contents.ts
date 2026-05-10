import { createClient } from "@/lib/supabase/server";

export interface ContentWithRelations {
  id: string;
  name: string;
  client_id: string | null;
  launch_id: string | null;
  status_id: string | null;
  format: string | null;
  platforms: string[] | null;
  objective: string | null;
  copy_post: string | null;
  copy_design: string | null;
  publish_date: string | null;
  notes: string | null;
  responsible_id: string | null;
  created_at: string;
  status: { id: string; key: string; label: string; color: string } | null;
  client: { id: string; name: string } | null;
  responsible: { id: string; full_name: string } | null;
}

export async function getContents(filters?: { clientId?: string }): Promise<ContentWithRelations[]> {
  const supabase = await createClient();
  let q = supabase
    .from("contents")
    .select(
      `
      *,
      status:content_statuses(id, key, label, color),
      client:clients(id, name),
      responsible:team_members!contents_responsible_id_fkey(id, full_name)
      `,
    )
    .order("created_at", { ascending: false });
  if (filters?.clientId) q = q.eq("client_id", filters.clientId);
  const { data } = await q;
  return (data ?? []) as ContentWithRelations[];
}

export async function getContentById(id: string): Promise<ContentWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contents")
    .select(
      `
      *,
      status:content_statuses(id, key, label, color),
      client:clients(id, name),
      responsible:team_members!contents_responsible_id_fkey(id, full_name)
      `,
    )
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as ContentWithRelations | null;
}
