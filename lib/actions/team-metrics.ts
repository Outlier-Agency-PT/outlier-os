"use server";

import { getConcludedStatusId } from "@/lib/queries/dashboard-colaborador";
import { getTeamMetrics, type TeamMetricsResult } from "@/lib/queries/team-metrics";

export async function fetchTeamMetricsAction(
  periodStartISO: string,
  periodEndISO: string,
): Promise<TeamMetricsResult> {
  const concludedStatusId = await getConcludedStatusId();
  return getTeamMetrics(new Date(periodStartISO), new Date(periodEndISO), concludedStatusId);
}
