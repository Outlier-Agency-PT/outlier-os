import { UsersRound, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";
import { Button } from "@/components/ui/button";

export default function EquipaPage() {
  return (
    <>
      <PageHeader
        title="Equipa"
        description="Gestão de membros e permissões"
        actions={
          <Button>
            <Plus />
            Convidar Membro
          </Button>
        }
      />
      <div className="p-8">
        <EmptyModule
          icon={UsersRound}
          title="Gestão de Equipa"
          description="Lista de membros com função (Admin/Membro), departamento, tarefas abertas e permissões granulares por módulo."
          sprintTag="Sprint 1"
        />
      </div>
    </>
  );
}
