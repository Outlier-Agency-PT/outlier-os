import { addDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { CheckpointPageClient } from "@/components/checkpoints/checkpoint-page-client";
import {
  getWeeklyCheckpoints,
  getUserDepartments,
  getAutoMetrics,
} from "@/lib/actions/checkpoints";
import { getWeekStart } from "@/lib/utils/week-utils";

export const dynamic = "force-dynamic";

export default async function ReuniaoSemanalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const weekStart = getWeekStart();
  const weekEnd = addDays(weekStart, 7);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const [memberResult, checkpoints, userDepartments, incMetrics, devMetrics] = await Promise.all([
    supabase.from("team_members").select("role").eq("id", user?.id ?? "").maybeSingle(),
    getWeeklyCheckpoints(weekStart),
    getUserDepartments(),
    getAutoMetrics("incubadora", weekStart, weekEnd),
    getAutoMetrics("desenvolvimento", weekStart, weekEnd),
  ]);

  const isAdmin = memberResult.data?.role === "admin";

  return (
    <>
      <PageHeader
        title="Reunião Semanal"
        description="Checkpoint semanal por departamento."
      />
      <CheckpointPageClient
        initialCheckpoints={checkpoints as Parameters<typeof CheckpointPageClient>[0]["initialCheckpoints"]}
        initialAutoMetrics={{ incubadora: incMetrics, desenvolvimento: devMetrics }}
        userDepartments={userDepartments}
        isAdmin={isAdmin}
        initialWeekStart={weekStartStr}
      />
    </>
  );
}
