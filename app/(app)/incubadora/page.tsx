import { GraduationCap, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";
import { Button } from "@/components/ui/button";

export default function IncubadoraPage() {
  return (
    <>
      <PageHeader
        title="Incubadora"
        description="Alunos da Incubadora de Infoprodutores"
        actions={
          <Button>
            <Plus />
            Novo Aluno
          </Button>
        }
      />
      <div className="p-8">
        <EmptyModule
          icon={GraduationCap}
          title="Gestão de Alunos"
          description="Kanban por nível (Aprendiz/Fazedor/Autoridade/Referência/Aguardar), timeline de 6 sessões, briefing e tracking de coach."
          sprintTag="Sprint 4"
        />
      </div>
    </>
  );
}
