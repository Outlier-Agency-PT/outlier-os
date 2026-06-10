import { PageHeader } from "@/components/layout/page-header";
import { DecisionsBoard } from "@/components/decisions/decisions-board";
import { getDecisions } from "@/lib/queries/decisions";
import { getInitiatives } from "@/lib/queries/initiatives";
import { getClients } from "@/lib/queries/clients";
import { getMentorships } from "@/lib/queries/mentorships";

export const dynamic = "force-dynamic";

export default async function DecisoesPage() {
  const [decisions, initiatives, clients, mentorships] = await Promise.all([
    getDecisions(),
    getInitiatives(),
    getClients(),
    getMentorships(),
  ]);

  return (
    <>
      <PageHeader
        title="Decisões"
        description="Decision log — captura, decide, regista."
      />
      <DecisionsBoard
        decisions={decisions}
        initiatives={initiatives.map((i) => ({ id: i.id, title: i.title }))}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        mentorships={mentorships.map((m) => ({ id: m.id, name: m.name }))}
      />
    </>
  );
}
