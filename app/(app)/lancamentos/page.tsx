import { PageHeader } from "@/components/layout/page-header";
import { LaunchesBoard } from "@/components/launches/launches-board";
import { getLaunches, getLaunchTemplates } from "@/lib/queries/launches";
import { getStatuses } from "@/lib/queries/statuses";
import { getClients } from "@/lib/queries/clients";

export const dynamic = "force-dynamic";

export default async function LancamentosPage() {
  const [launches, statuses, clients, templates] = await Promise.all([
    getLaunches(),
    getStatuses("launch_statuses"),
    getClients(),
    getLaunchTemplates(),
  ]);

  return (
    <>
      <PageHeader
        title="Lançamentos"
        description={`${launches.length} ${launches.length === 1 ? "lançamento" : "lançamentos"}`}
      />
      <LaunchesBoard
        launches={launches}
        statuses={statuses}
        clients={clients.map((c) => ({ id: c.id, label: c.name }))}
        templates={templates.map((t) => ({ id: t.id, label: t.name, task_count: t.task_count }))}
      />
    </>
  );
}
