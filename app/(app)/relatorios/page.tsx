import { PageHeader } from "@/components/layout/page-header";
import { ReportsList } from "@/components/reports/reports-list";
import { getReports } from "@/lib/queries/reports";
import { getClients } from "@/lib/queries/clients";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const [reports, clients] = await Promise.all([getReports(), getClients()]);

  return (
    <>
      <PageHeader
        title="Relatórios"
        description={`${reports.length} ${reports.length === 1 ? "relatório" : "relatórios"}`}
      />
      <ReportsList reports={reports} clients={clients.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
