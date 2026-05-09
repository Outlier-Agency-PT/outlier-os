import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";
import { Button } from "@/components/ui/button";

export default function RelatoriosPage() {
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Relatórios semanais e mensais por cliente"
        actions={
          <Button>
            <Plus />
            Gerar Relatório
          </Button>
        }
      />
      <div className="p-8">
        <EmptyModule
          icon={ClipboardList}
          title="Relatórios Automáticos"
          description="Gerador semanal/mensal com KPIs automáticos (tarefas concluídas, conteúdos publicados, lançamentos ativos) e editor markdown."
          sprintTag="Sprint 3"
        />
      </div>
    </>
  );
}
