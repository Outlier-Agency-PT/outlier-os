import { createClient } from "@/lib/supabase/server";
import { DOC_TYPES } from "@/lib/constants/process-types";
import type { DocType } from "@/lib/constants/process-types";
import type { DecisionData } from "@/lib/actions/processes";
import OpenAI from "openai";

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
    .order("created_at", { ascending: true });

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

export type ProcessWithSimilarity = Process & { similarity?: number };

// New processes get their embedding generated via generateAndSaveEmbedding,
// called from createProcessAction and updateProcessAction after saving.
// The RPC filters embedding IS NOT NULL, so unindexed processes are excluded from semantic results.
export async function generateAndSaveEmbedding(processId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: proc } = await supabase
      .from("processes")
      .select("title, subcategory, content_md")
      .eq("id", processId)
      .single();
    if (!proc) return;

    const rawText = `${proc.title}\n${proc.subcategory ?? ""}\n${proc.content_md ?? ""}`;
    const inputText = rawText.slice(0, 8000);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: inputText,
    });
    const embedding = response.data[0].embedding;

    await supabase.from("processes").update({ embedding }).eq("id", processId);
  } catch (err) {
    console.error("generateAndSaveEmbedding failed:", err);
  }
}

export async function searchProcessesSemantic(query: string): Promise<ProcessWithSimilarity[] | null> {
  try {
    // Fix 1: Normalize query before embedding
    const normalizedQuery = query
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Fix 4: Timeout after 3s — fall back to ILIKE
    const openaiCall = openai.embeddings.create({
      model: "text-embedding-3-small",
      input: normalizedQuery,
    });
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 3000)
    );
    const result = await Promise.race([openaiCall, timeoutPromise]);
    if (result === null) return null;

    const embedding = result.data[0].embedding;

    const supabase = await createClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "search_processes_semantic",
      // Fix 2: threshold 0.1
      { query_embedding: embedding, similarity_threshold: 0.1, match_count: 20 }
    );

    if (rpcError) return null;
    if (!rpcData || rpcData.length === 0) return [];

    // Fix 3: Deduplicate by id
    const seen = new Set<string>();
    const unique = (rpcData as { id: string; category_id: string | null }[]).filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    const categoryIds: string[] = [
      ...new Set(
        unique
          .map((r) => r.category_id)
          .filter((id): id is string => id !== null)
      ),
    ];

    const { data: categories } = await supabase
      .from("process_categories")
      .select("id, label, color")
      .in("id", categoryIds);

    const categoryMap = new Map(
      (categories ?? []).map((c) => [c.id, c])
    );

    return (unique as {
      id: string;
      title: string;
      subcategory: string | null;
      doc_type: string;
      published: boolean;
      category_id: string | null;
      similarity: number;
    }[]).map((row) => ({
      id: row.id,
      title: row.title,
      description: null,
      doc_type: row.doc_type as DocType,
      category_id: row.category_id,
      subcategory: row.subcategory,
      content_md: null,
      miro_link: null,
      external_links: null,
      tags: null,
      published: row.published,
      created_by: null,
      created_at: "",
      updated_at: "",
      decision_data: null,
      version: null,
      last_reviewed_at: null,
      template_target: null,
      category: row.category_id ? (categoryMap.get(row.category_id) ?? null) : null,
      similarity: row.similarity,
    }));
  } catch {
    return null;
  }
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
