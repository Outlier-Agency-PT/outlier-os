import { Users, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";
import { Button } from "@/components/ui/button";

export default function ClientesPage() {
  return (
    <>
      <PageHeader
        title="Clientes"
        description="Gere os teus clientes, dashboards e métricas"
        actions={
          <Button>
            <Plus />
            Novo Cliente
          </Button>
        }
      />
      <div className="p-8">
        <EmptyModule
          icon={Users}
          title="Gestão de Clientes"
          description="Lista, kanban e detalhe de clientes com 7 tabs (Overview, Tarefas, Lançamentos, Conteúdo, Reuniões, Relatórios, Feedback) e dashboard partilhado público."
          sprintTag="Sprint 1"
        />
      </div>
    </>
  );
}
