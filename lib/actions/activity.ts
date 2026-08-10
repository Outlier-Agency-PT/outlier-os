"use server";

import { getRecentActivity } from "@/lib/queries/activity";
import type { Activity } from "@/lib/utils/activity-helpers";

export async function fetchRecentActivityAction(memberId?: string): Promise<Activity[]> {
  return getRecentActivity(20, memberId);
}
