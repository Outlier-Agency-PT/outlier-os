"use server";

import { getTeamWeeklyHours, type TeamMemberHours } from "@/lib/queries/dashboard-colaborador";

export async function fetchTeamWeeklyHoursAction(weekStartISO: string): Promise<TeamMemberHours[]> {
  return getTeamWeeklyHours(new Date(weekStartISO));
}
