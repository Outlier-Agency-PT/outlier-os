import { createClient } from "@/lib/supabase/server";
import { getConcludedStatusId } from "@/lib/queries/dashboard-colaborador";

export interface DepartmentTaskCounts {
  vendas: number;
  marketing: number;
  operacoesDesign: number;
  desenvolvimento: number;
}

function monthRange(): { startISO: string; endISO: string; startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

async function getDepartmentMemberIds(departments: string[]): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("id")
    .in("department", departments);
  return (data ?? []).map((m: { id: string }) => m.id);
}

async function getOpenTasksCountForMembers(
  memberIds: string[],
  concludedStatusId: string | null,
): Promise<number> {
  if (memberIds.length === 0) return 0;

  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .or(`assignee_id.in.(${memberIds.join(",")}),assignees.ov.{${memberIds.join(",")}}`);

  if (concludedStatusId) {
    query = query.neq("status_id", concludedStatusId);
  }

  const { count } = await query;
  return count ?? 0;
}

export async function getDepartmentTaskCounts(concludedStatusId?: string | null): Promise<DepartmentTaskCounts> {
  const concludedId = concludedStatusId !== undefined ? concludedStatusId : await getConcludedStatusId();

  const [vendasIds, marketingIds, opsDesignIds, desenvolvimentoIds] = await Promise.all([
    getDepartmentMemberIds(["Vendas"]),
    getDepartmentMemberIds(["Marketing"]),
    getDepartmentMemberIds(["Operações", "Design"]),
    getDepartmentMemberIds(["Desenvolvimento"]),
  ]);

  const [vendas, marketing, operacoesDesign, desenvolvimento] = await Promise.all([
    getOpenTasksCountForMembers(vendasIds, concludedId),
    getOpenTasksCountForMembers(marketingIds, concludedId),
    getOpenTasksCountForMembers(opsDesignIds, concludedId),
    getOpenTasksCountForMembers(desenvolvimentoIds, concludedId),
  ]);

  return { vendas, marketing, operacoesDesign, desenvolvimento };
}

export async function getContentsPublishedThisMonth(): Promise<number> {
  const supabase = await createClient();
  const { data: publishedStatus } = await supabase
    .from("content_statuses")
    .select("id")
    .eq("key", "publicado")
    .maybeSingle();

  if (!publishedStatus) return 0;

  const { startISO, endISO } = monthRange();
  const { count } = await supabase
    .from("contents")
    .select("*", { count: "exact", head: true })
    .eq("status_id", publishedStatus.id)
    .gte("publish_date", startISO)
    .lt("publish_date", endISO);

  return count ?? 0;
}

export async function getLaunchesDeliveredThisMonth(): Promise<number> {
  const supabase = await createClient();
  const { data: concludedStatus } = await supabase
    .from("launch_statuses")
    .select("id")
    .eq("key", "concluido")
    .maybeSingle();

  if (!concludedStatus) return 0;

  const { startDate, endDate } = monthRange();
  const { count } = await supabase
    .from("launches")
    .select("*", { count: "exact", head: true })
    .eq("status_id", concludedStatus.id)
    .gte("end_date", startDate)
    .lt("end_date", endDate);

  return count ?? 0;
}
