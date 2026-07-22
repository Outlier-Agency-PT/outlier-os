import { createClient } from "@/lib/supabase/server";

export interface WhiteboardSummary {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Whiteboard extends WhiteboardSummary {
  data: Record<string, unknown>;
}

export async function getWhiteboards(): Promise<WhiteboardSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whiteboards")
    .select("id, title, description, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as WhiteboardSummary[];
}

export async function getWhiteboard(id: string): Promise<Whiteboard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whiteboards")
    .select("id, title, description, data, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Whiteboard | null;
}
