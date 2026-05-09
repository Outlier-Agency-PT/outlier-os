import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";
import { Button } from "@/components/ui/button";

export default function ConteudoPage() {
  return (
    <>
      <PageHeader
        title="Conteúdo"
        description="Calendário de conteúdo com workflow editorial 9-stages"
        actions={
          <Button>
            <Plus />
            Novo Conteúdo
          </Button>
        }
      />
      <div className="p-8">
        <EmptyModule
          icon={FileText}
          title="Workflow Editorial"
          description="9 stages (Ideia → Aprovação Ideia → Aprovado → Design → Copy → Aprovação Final → Agendado → Publicado/Rejeitado), upload de ficheiros, copy + copy design separados, feedback do cliente."
          sprintTag="Sprint 2"
        />
      </div>
    </>
  );
}
