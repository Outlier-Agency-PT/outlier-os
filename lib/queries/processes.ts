import { createClient } from "@/lib/supabase/server";
import { DOC_TYPES } from "@/lib/constants/process-types";
import type { DocType } from "@/lib/constants/process-types";
import type { DecisionData } from "@/lib/actions/processes";

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
  subcategory: string | null;
  content_md: string | null;
  miro_link: string | null;
  external_links: Array<{ label: string; url: string }> | null;
  tags: string[] | null;
  published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category: { id: string; label: string; color: string } | null;
  decision_data: DecisionData | null;
  version: string | null;
  last_reviewed_at: string | null;
  template_target: 'processo' | 'briefing' | 'tarefas' | null;
}

export async function getProcesses(filters?: {
  search?: string;
  categoryId?: string | null;
}): Promise<Process[]> {
  const supabase = await createClient();

  let q = supabase
    .from("processes")
    .select(
      `id, title, description, doc_type, category_id, subcategory, content_md,
       miro_link, external_links, tags, published,
       created_by, created_at, updated_at,
       decision_data, version, last_reviewed_at, template_target,
       category:process_categories(id, label, color)`
    )
    .order("title", { ascending: true });

  if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters?.search?.trim()) q = q.ilike("title", `%${filters.search.trim()}%`);

  const { data } = await q;
  return (data ?? []) as unknown as Process[];
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

export async function getChecklistProgress(
  processId: string,
  userId: string
): Promise<number[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checklist_progress")
    .select("item_index")
    .eq("process_id", processId)
    .eq("user_id", userId);
  return data?.map((r) => r.item_index) ?? [];
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
