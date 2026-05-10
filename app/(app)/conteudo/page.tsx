import { PageHeader } from "@/components/layout/page-header";
import { ContentsBoard } from "@/components/contents/contents-board";
import { getContents } from "@/lib/queries/contents";
import { getStatuses } from "@/lib/queries/statuses";
import { getClients } from "@/lib/queries/clients";
import { getTeamMembers } from "@/lib/queries/team";

export const dynamic = "force-dynamic";

export default async function ConteudoPage() {
  const [contents, statuses, clients, members] = await Promise.all([
    getContents(),
    getStatuses("content_statuses"),
    getClients(),
    getTeamMembers(),
  ]);

  return (
    <>
      <PageHeader
        title="Conteúdo"
        description={`${contents.length} ${contents.length === 1 ? "conteúdo" : "conteúdos"}`}
      />
      <ContentsBoard
        contents={contents}
        statuses={statuses}
        clients={clients.map((c) => ({ id: c.id, label: c.name }))}
        members={members.map((m) => ({ id: m.id, label: m.full_name }))}
      />
    </>
  );
}
