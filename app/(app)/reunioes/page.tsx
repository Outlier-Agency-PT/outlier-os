import { Calendar, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyModule } from "@/components/layout/empty-module";
import { Button } from "@/components/ui/button";

export default function ReunioesPage() {
  return (
    <>
      <PageHeader
        title="Reuniões"
        description="Agenda e notas de reuniões"
        actions={
          <Button>
            <Plus />
            Nova Reunião
          </Button>
        }
      />
      <div className="p-8">
        <EmptyModule
          icon={Calendar}
          title="Calendário de Reuniões"
          description="Vista Agenda (semana) + Lista, com agenda, notas, attendees e ligação a cliente."
          sprintTag="Sprint 4"
        />
      </div>
    </>
  );
}
