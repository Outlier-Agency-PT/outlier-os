import { PageHeader } from "@/components/layout/page-header";
import { TeamTable } from "@/components/team/team-table";
import { Button } from "@/components/ui/button";
import { getTeamMembers, isCurrentUserAdmin } from "@/lib/queries/team";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function EquipaPage() {
  const [members, isAdmin] = await Promise.all([getTeamMembers(), isCurrentUserAdmin()]);

  return (
    <>
      <PageHeader
        title="Equipa"
        description={`${members.length} ${members.length === 1 ? "membro" : "membros"}`}
        actions={
          isAdmin && (
            <Button asChild>
              <a
                href="https://supabase.com/dashboard/project/_/auth/users"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Plus />
                Adicionar Membro
              </a>
            </Button>
          )
        }
      />
      <div className="space-y-4 p-8">
        {isAdmin && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              <p>
                <strong>Como adicionar membros:</strong> vai ao dashboard Supabase →
                Authentication → Users → <em>Add user</em>. O trigger automático cria
                o registo correspondente em <code>team_members</code>. Depois edita
                aqui para definir função, departamento e permissões.
              </p>
            </CardContent>
          </Card>
        )}
        <TeamTable members={members} isAdmin={isAdmin} />
      </div>
    </>
  );
}
