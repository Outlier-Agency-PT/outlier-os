import { PageHeader } from "@/components/layout/page-header";
import { StagesSection } from "@/components/configuracoes/stages-section";
import { Card, CardContent } from "@/components/ui/card";
import { getStatuses } from "@/lib/queries/statuses";
import { isCurrentUserAdmin } from "@/lib/queries/team";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const [isAdmin, clientStatuses, taskStatuses, launchStatuses, contentStatuses] = await Promise.all([
    isCurrentUserAdmin(),
    getStatuses("client_statuses"),
    getStatuses("task_statuses"),
    getStatuses("launch_statuses"),
    getStatuses("content_statuses"),
  ]);

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Configurações" description="Gestão do sistema Outlier OS" />
        <div className="p-8">
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Apenas administradores podem aceder às Configurações.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Configurações" description="Gestão do sistema Outlier OS" />
      <div className="space-y-6 p-8">
        <StagesSection
          title="Stages de Clientes"
          description="Estados possíveis dos clientes (ex: Ativo, Pausado)"
          table="client_statuses"
          statuses={clientStatuses}
        />
        <StagesSection
          title="Stages de Tarefas"
          description="Colunas do Kanban e valores possíveis das tarefas"
          table="task_statuses"
          statuses={taskStatuses}
        />
        <StagesSection
          title="Stages de Lançamentos"
          description="Pipeline de lançamentos"
          table="launch_statuses"
          statuses={launchStatuses}
        />
        <StagesSection
          title="Stages de Conteúdo"
          description="Workflow editorial (Ideia → Publicado)"
          table="content_statuses"
          statuses={contentStatuses}
        />
      </div>
    </>
  );
}
