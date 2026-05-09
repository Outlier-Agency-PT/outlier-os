import { Rocket, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";
import { Button } from "@/components/ui/button";

export default function LancamentosPage() {
  return (
    <>
      <PageHeader
        title="Lançamentos"
        description="Pipeline de lançamentos com templates automáticos"
        actions={
          <Button>
            <Plus />
            Novo Lançamento
          </Button>
        }
      />
      <div className="p-8">
        <EmptyModule
          icon={Rocket}
          title="Pipeline de Lançamentos"
          description="Kanban 7-col (Planeamento → Administrativo → Onboarding → Operações → Novas Tarefas → Concluído/Cancelado), com templates reutilizáveis e detalhe de progresso."
          sprintTag="Sprint 2"
        />
      </div>
    </>
  );
}
