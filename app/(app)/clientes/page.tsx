import { PageHeader } from "@/components/layout/page-header";
import { ClientsList } from "@/components/clients/clients-list";
import { getClients } from "@/lib/queries/clients";
import { getStatuses } from "@/lib/queries/statuses";
import { getTeamMembers } from "@/lib/queries/team";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const [clients, statuses, members] = await Promise.all([
    getClients(),
    getStatuses("client_statuses"),
    getTeamMembers(),
  ]);

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${clients.length} ${clients.length === 1 ? "cliente" : "clientes"}`}
      />
      <ClientsList
        clients={clients}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        members={members.map((m) => ({ id: m.id, full_name: m.full_name }))}
      />
    </>
  );
}
