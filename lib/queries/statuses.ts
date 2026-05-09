import { createClient } from "@/lib/supabase/server";
import type { Status } from "@/lib/types";

type StatusTable =
  | "client_statuses"
  | "task_statuses"
  | "launch_statuses"
  | "content_statuses";

export async function getStatuses(table: StatusTable): Promise<Status[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select("*")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as Status[];
}
