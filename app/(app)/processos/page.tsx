import { BookOpen, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";
import { Button } from "@/components/ui/button";

export default function ProcessosPage() {
  return (
    <>
      <PageHeader
        title="Processos & SOPs"
        description="Documentação interna por categoria"
        actions={
          <Button>
            <Plus />
            Novo Processo
          </Button>
        }
      />
      <div className="p-8">
        <EmptyModule
          icon={BookOpen}
          title="Processos & SOPs"
          description="Editor TipTap com slash commands, link Miro, tags, links externos e 8 categorias (Tráfego, Conteúdo, Onboarding, Vendas, Administrativo, Estratégia, Design, Incubadora)."
          sprintTag="Sprint 4"
        />
      </div>
    </>
  );
}
