import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { TeamMetricsClient } from "@/components/team/team-metrics-client";
import { isCurrentUserAdmin } from "@/lib/queries/team";
import { getConcludedStatusId } from "@/lib/queries/dashboard-colaborador";
import { getTeamMetrics, fetchOverdueTasks } from "@/lib/queries/team-metrics";
import { getWeekStart } from "@/lib/utils/week-utils";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function EquipaMetricasPage() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/equipa");

  const weekStart = getWeekStart();
  const concludedStatusId = await getConcludedStatusId();
  const [initialData, overdueTasks] = await Promise.all([
    getTeamMetrics(weekStart, new Date(), concludedStatusId),
    fetchOverdueTasks(concludedStatusId),
  ]);

  return (
    <>
      <PageHeader
        title="Métricas de Equipa"
        description="Desempenho por pessoa e totais da equipa."
      />
      <TeamMetricsClient initialData={initialData} overdueTasks={overdueTasks} />
    </>
  );
}
