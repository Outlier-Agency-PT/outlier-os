import { PageHeader } from "@/components/layout/page-header";
import { MeetingsView } from "@/components/meetings/meetings-view";
import { getMeetings } from "@/lib/queries/meetings";
import { getClients } from "@/lib/queries/clients";

export const dynamic = "force-dynamic";

export default async function ReunioesPage() {
  const [meetings, clients] = await Promise.all([getMeetings(), getClients()]);

  return (
    <>
      <PageHeader
        title="Reuniões"
        description={`${meetings.length} ${meetings.length === 1 ? "reunião" : "reuniões"}`}
      />
      <MeetingsView meetings={meetings} clients={clients.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
