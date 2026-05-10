import { createClient } from "@/lib/supabase/server";

export interface FinancialCategory {
  id: string;
  type: "receita" | "despesa";
  name: string;
  color: string;
  is_default: boolean;
  sort_order: number;
}

export interface Transaction {
  id: string;
  type: "receita" | "despesa";
  amount: number;
  description: string;
  category_id: string | null;
  client_id: string | null;
  transaction_date: string;
  notes: string | null;
  recurring_id: string | null;
  created_at: string;
  category: { id: string; name: string; color: string } | null;
  client: { id: string; name: string } | null;
}

export interface RecurringTransaction {
  id: string;
  type: "receita" | "despesa";
  amount: number;
  description: string;
  category_id: string | null;
  client_id: string | null;
  frequency: string;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
  last_generated_date: string | null;
}

export async function getFinancialCategories(): Promise<FinancialCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financial_categories")
    .select("*")
    .eq("active", true)
    .order("type")
    .order("sort_order");
  return (data ?? []) as FinancialCategory[];
}

export async function getTransactions(filters?: {
  type?: "receita" | "despesa";
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  clientId?: string;
}): Promise<Transaction[]> {
  const supabase = await createClient();
  let q = supabase
    .from("transactions")
    .select(
      `
      *,
      category:financial_categories(id, name, color),
      client:clients(id, name)
      `,
    )
    .order("transaction_date", { ascending: false });

  if (filters?.type) q = q.eq("type", filters.type);
  if (filters?.startDate) q = q.gte("transaction_date", filters.startDate);
  if (filters?.endDate) q = q.lte("transaction_date", filters.endDate);
  if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters?.clientId) q = q.eq("client_id", filters.clientId);

  const { data } = await q;
  return (data ?? []) as Transaction[];
}

export async function getRecurringTransactions(): Promise<RecurringTransaction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });
  return (data ?? []) as RecurringTransaction[];
}

export interface PnLSummary {
  totalReceita: number;
  totalDespesa: number;
  lucro: number;
  margin: number;
  byMonth: Array<{ month: string; receita: number; despesa: number }>;
  byCategoryReceita: Array<{ name: string; total: number; color: string }>;
  byCategoryDespesa: Array<{ name: string; total: number; color: string }>;
}

export async function getPnLSummary(year: number): Promise<PnLSummary> {
  const supabase = await createClient();
  const startDate = `${year}-01-01`;
  const endDate = `${year + 1}-01-01`;

  const { data: transactions } = await supabase
    .from("transactions")
    .select("type, amount, transaction_date, category:financial_categories(name, color)")
    .gte("transaction_date", startDate)
    .lt("transaction_date", endDate);

  type Row = {
    type: "receita" | "despesa";
    amount: number;
    transaction_date: string;
    category: { name: string; color: string } | { name: string; color: string }[] | null;
  };

  const list: Row[] = (transactions ?? []) as Row[];

  let totalReceita = 0;
  let totalDespesa = 0;
  const byMonthMap = new Map<string, { receita: number; despesa: number }>();
  const byCategoryReceita = new Map<string, { total: number; color: string }>();
  const byCategoryDespesa = new Map<string, { total: number; color: string }>();

  for (const t of list) {
    const amount = Number(t.amount);
    if (t.type === "receita") totalReceita += amount;
    else totalDespesa += amount;

    const monthKey = t.transaction_date.slice(0, 7);
    const monthData = byMonthMap.get(monthKey) ?? { receita: 0, despesa: 0 };
    if (t.type === "receita") monthData.receita += amount;
    else monthData.despesa += amount;
    byMonthMap.set(monthKey, monthData);

    const cat = Array.isArray(t.category) ? t.category[0] : t.category;
    if (cat) {
      const map = t.type === "receita" ? byCategoryReceita : byCategoryDespesa;
      const existing = map.get(cat.name) ?? { total: 0, color: cat.color };
      existing.total += amount;
      map.set(cat.name, existing);
    }
  }

  return {
    totalReceita,
    totalDespesa,
    lucro: totalReceita - totalDespesa,
    margin: totalReceita > 0 ? ((totalReceita - totalDespesa) / totalReceita) * 100 : 0,
    byMonth: Array.from(byMonthMap.entries())
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    byCategoryReceita: Array.from(byCategoryReceita.entries()).map(([name, v]) => ({
      name,
      total: v.total,
      color: v.color,
    })),
    byCategoryDespesa: Array.from(byCategoryDespesa.entries()).map(([name, v]) => ({
      name,
      total: v.total,
      color: v.color,
    })),
  };
}
