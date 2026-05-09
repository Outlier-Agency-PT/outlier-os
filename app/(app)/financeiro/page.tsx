import { DollarSign, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";
import { Button } from "@/components/ui/button";

export default function FinanceiroPage() {
  return (
    <>
      <PageHeader
        title="Financeiro"
        description="P&L, transações e recorrentes"
        actions={
          <Button>
            <Plus />
            Nova Transação
          </Button>
        }
      />
      <div className="p-8">
        <EmptyModule
          icon={DollarSign}
          title="Profit & Loss"
          description="P&L mensal/trimestral/anual, gráfico Receita vs Despesa, transações recorrentes com gerador automático, import/export CSV, 14 categorias padrão."
          sprintTag="Sprint 3"
        />
      </div>
    </>
  );
}
