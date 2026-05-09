import { CheckSquare, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";
import { Button } from "@/components/ui/button";

export default function TarefasPage() {
  return (
    <>
      <PageHeader
        title="Tarefas"
        description="Kanban com drag-and-drop, filtros e registo de tempo"
        actions={
          <Button>
            <Plus />
            Nova Tarefa
          </Button>
        }
      />
      <div className="p-8">
        <EmptyModule
          icon={CheckSquare}
          title="Gestão de Tarefas"
          description="Kanban 6-col + Tabela, com prioridades, registo de tempo (timer + manual), comentários e bulk actions."
          sprintTag="Sprint 1"
        />
      </div>
    </>
  );
}
