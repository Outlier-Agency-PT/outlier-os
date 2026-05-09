import { Target, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";
import { Button } from "@/components/ui/button";

export default function OkrsPage() {
  return (
    <>
      <PageHeader
        title="OKRs"
        description="Objectivos e Key Results por trimestre"
        actions={
          <Button>
            <Plus />
            Novo Objetivo
          </Button>
        }
      />
      <div className="p-8">
        <EmptyModule
          icon={Target}
          title="Objectivos & Key Results"
          description="Vista por trimestre com confiança (Alta/Média/Baixa), agrupamento por departamento, key results com início/atual/meta e progresso colorido."
          sprintTag="Sprint 3"
        />
      </div>
    </>
  );
}
