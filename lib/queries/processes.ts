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

export interface GetProcessesResult {
  data: Process[];
  total: number;
}

export async function getProcesses(filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string | null;
}): Promise<GetProcessesResult> {
  const supabase = await createClient();
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = filters?.pageSize ?? 24;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("processes")
    .select(`*, category:process_categories(id, label, color)`, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters?.search?.trim()) q = q.ilike("title", `%${filters.search.trim()}%`);

  const { data, count } = await q;
  return { data: (data ?? []) as Process[], total: count ?? 0 };
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
