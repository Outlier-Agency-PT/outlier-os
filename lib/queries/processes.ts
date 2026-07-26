import { createClient } from "@/lib/supabase/server";
import { DOC_TYPES } from "@/lib/constants/process-types";
import type { DocType } from "@/lib/constants/process-types";

export { DOC_TYPES, type DocType };

export interface ProcessCategory {
  id: string;
  key: string;
  label: string;
  color: string;
  sort_order: number;
}

export interface Process {
  id: string;
  title: string;
  description: string | null;
  doc_type: DocType;
  category_id: string | null;
  content_md: string | null;
  miro_link: string | null;
  external_links: Array<{ label: string; url: string }> | null;
  tags: string[] | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  category: { id: string; label: string; color: string } | null;
}

export async function getProcesses(filters?: { categoryId?: string }): Promise<Process[]> {
  const supabase = await createClient();
  let q = supabase
    .from("processes")
    .select(`*, category:process_categories(id, label, color)`)
    .order("updated_at", { ascending: false });
  if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
  const { data } = await q;
  return (data ?? []) as Process[];
}

export async function getProcessById(id: string): Promise<Process | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("processes")
    .select(`*, category:process_categories(id, label, color)`)
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as Process | null;
}

export async function getProcessCategories(): Promise<ProcessCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("process_categories")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as ProcessCategory[];
}
