import { createClient } from "@/lib/supabase/server";

export interface TaskTemplateCategory {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface TaskTemplateItem {
  id: string;
  template_id: string;
  parent_item_id: string | null;
  title: string;
  description: string | null;
  priority: "sem_prioridade" | "baixa" | "media" | "alta" | "urgente";
  estimate_points: number | null;
  sort_order: number;
  default_assignee_id: string | null;
  default_assignee_name: string | null;
  day_offset: number;
  default_status_id: string | null;
  children: TaskTemplateItem[];
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  space_id: string | null;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  created_by: string | null;
  created_at: string;
  items: TaskTemplateItem[];
}

type FlatItem = Omit<TaskTemplateItem, "children">;

function buildItemTree(flat: FlatItem[]): TaskTemplateItem[] {
  const map = new Map<string, TaskTemplateItem>();
  const roots: TaskTemplateItem[] = [];

  for (const item of flat) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of flat) {
    const node = map.get(item.id)!;
    if (item.parent_item_id && map.has(item.parent_item_id)) {
      map.get(item.parent_item_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  roots.sort((a, b) => a.sort_order - b.sort_order);
  for (const node of map.values()) {
    node.children.sort((a, b) => a.sort_order - b.sort_order);
  }

  return roots;
}

function mapRawItem(raw: any): FlatItem {
  return {
    id: raw.id,
    template_id: raw.template_id,
    parent_item_id: raw.parent_item_id ?? null,
    title: raw.title,
    description: raw.description ?? null,
    priority: raw.priority,
    estimate_points: raw.estimate_points ?? null,
    sort_order: raw.sort_order ?? 0,
    default_assignee_id: raw.default_assignee_id ?? null,
    default_assignee_name: raw.default_assignee?.full_name ?? null,
    day_offset: raw.day_offset ?? 0,
    default_status_id: raw.default_status_id ?? null,
  };
}

function mapRawTemplate(raw: any, items: FlatItem[]): TaskTemplate {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    space_id: raw.space_id ?? null,
    category_id: raw.category_id ?? null,
    category_name: raw.category?.name ?? null,
    category_color: raw.category?.color ?? null,
    created_by: raw.created_by ?? null,
    created_at: raw.created_at,
    items: buildItemTree(items),
  };
}

export async function getTaskTemplateCategories(): Promise<TaskTemplateCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_template_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data ?? []) as TaskTemplateCategory[];
}

export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const supabase = await createClient();

  const { data: rawTemplates } = await supabase
    .from("task_templates")
    .select("*, category:task_template_categories(name, color)")
    .order("name", { ascending: true });

  if (!rawTemplates || rawTemplates.length === 0) return [];

  const templateIds = rawTemplates.map((t: any) => t.id);
  const { data: rawItems } = await supabase
    .from("task_template_items")
    .select("*, default_assignee:team_members(full_name)")
    .in("template_id", templateIds)
    .order("sort_order", { ascending: true });

  const flatItemsByTemplate = new Map<string, FlatItem[]>();
  for (const raw of rawItems ?? []) {
    const item = mapRawItem(raw);
    if (!flatItemsByTemplate.has(item.template_id)) {
      flatItemsByTemplate.set(item.template_id, []);
    }
    flatItemsByTemplate.get(item.template_id)!.push(item);
  }

  return rawTemplates.map((raw: any) =>
    mapRawTemplate(raw, flatItemsByTemplate.get(raw.id) ?? []),
  );
}

export async function getTaskTemplate(id: string): Promise<TaskTemplate | null> {
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("task_templates")
    .select("*, category:task_template_categories(name, color)")
    .eq("id", id)
    .maybeSingle();

  if (!raw) return null;

  const { data: rawItems } = await supabase
    .from("task_template_items")
    .select("*, default_assignee:team_members(full_name)")
    .eq("template_id", id)
    .order("sort_order", { ascending: true });

  return mapRawTemplate(raw, (rawItems ?? []).map(mapRawItem));
}
