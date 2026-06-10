import { PageHeader } from "@/components/layout/page-header";
import { InitiativesList } from "@/components/initiatives/initiatives-list";
import { InitiativeCreateButton } from "@/components/initiatives/initiative-create-button";
import { getInitiatives, getInitiativeStats } from "@/lib/queries/initiatives";
import { getTeamMembers } from "@/lib/queries/team";
import { getClients } from "@/lib/queries/clients";
import { getMentorships } from "@/lib/queries/mentorships";

export const dynamic = "force-dynamic";

export default async function IniciativasPage() {
  const [initiatives, stats, members, clients, mentorships] = await Promise.all([
    getInitiatives(),
    getInitiativeStats(),
    getTeamMembers(),
    getClients(),
    getMentorships(),
  ]);

  const subtitle = [
    `${stats.total} total`,
    `${stats.emCurso} em curso`,
    stats.focusThisWeek > 0 && `${stats.focusThisWeek} no foco`,
    stats.needsDecision > 0 && `${stats.needsDecision} à tua espera`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title="Iniciativas"
        description={subtitle}
        actions={
          <InitiativeCreateButton
            members={members.map((m) => ({ id: m.id, full_name: m.full_name }))}
            clients={clients.map((c) => ({ id: c.id, name: c.name }))}
            mentorships={mentorships.map((m) => ({ id: m.id, name: m.name }))}
          />
        }
      />
      <div className="p-8">
        <InitiativesList initiatives={initiatives} />
      </div>
    </>
  );
}
