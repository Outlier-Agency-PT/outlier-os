import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";

export interface ClientWithStatus extends Client {
  status: { id: string; key: string; label: string; color: string } | null;
  responsible: { id: string; full_name: string; email: string } | null;
  task_count?: number;
  launch_count?: number;
  content_count?: number;
}

export async function getClients(): Promise<ClientWithStatus[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(
      `
      *,
      status:client_statuses(id, key, label, color),
      responsible:team_members!clients_responsible_id_fkey(id, full_name, email)
      `,
    )
    .order("created_at", { ascending: false });

  return (data ?? []) as ClientWithStatus[];
}

export async function getClientById(id: string): Promise<ClientWithStatus | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(
      `
      *,
      status:client_statuses(id, key, label, color),
      responsible:team_members!clients_responsible_id_fkey(id, full_name, email)
      `,
    )
    .eq("id", id)
    .maybeSingle();

  return (data ?? null) as ClientWithStatus | null;
}
