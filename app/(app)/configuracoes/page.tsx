import { Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";

export default function ConfiguracoesPage() {
  return (
    <>
      <PageHeader title="Configurações" description="Gestão do sistema Outlier OS" />
      <div className="p-8">
        <EmptyModule
          icon={Settings}
          title="Configuração do Sistema"
          description="Templates de Lançamento, Stages e Estados (Clientes/Tarefas/Lançamentos/Conteúdo), Categorias de Processos e Categorias Financeiras — tudo editável."
          sprintTag="Sprint 1"
        />
      </div>
    </>
  );
}
