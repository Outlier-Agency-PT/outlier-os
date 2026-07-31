import { PageHeader } from "@/components/layout/page-header";
import { MeetingsView } from "@/components/meetings/meetings-view";
import { getMeetings } from "@/lib/queries/meetings";
import { getClients } from "@/lib/queries/clients";
import { getStudents } from "@/lib/queries/students";

export const dynamic = "force-dynamic";

export default async function ReunioesPage() {
  const [meetings, clients, students] = await Promise.all([
    getMeetings(),
    getClients(),
    getStudents(),
  ]);

  return (
    <>
      <PageHeader
        title="Reuniões"
        description={`${meetings.length} ${meetings.length === 1 ? "reunião" : "reuniões"}`}
      />
      <MeetingsView
        meetings={meetings}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        students={students.map((s) => ({ id: s.id, name: s.name }))}
      />
    </>
  );
}
