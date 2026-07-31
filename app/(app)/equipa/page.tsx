import { PageHeader } from "@/components/layout/page-header";
import { TeamPageClient } from "@/components/team/team-page-client";
import { InviteManagement } from "@/components/team/invite-management";
import { getTeamMembers, isCurrentUserAdmin } from "@/lib/queries/team";

export const dynamic = "force-dynamic";

export default async function EquipaPage() {
  const [members, isAdmin] = await Promise.all([getTeamMembers(), isCurrentUserAdmin()]);

  return (
    <>
      <PageHeader title="Equipa" description="Gestão de membros e permissões" />
      <TeamPageClient members={members} isAdmin={isAdmin} />
      {isAdmin && (
        <div className="px-8 pb-8">
          <InviteManagement />
        </div>
      )}
    </>
  );
}
