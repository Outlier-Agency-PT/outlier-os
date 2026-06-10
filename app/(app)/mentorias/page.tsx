import { PageHeader } from "@/components/layout/page-header";
import { MentorshipsList } from "@/components/mentorships/mentorships-list";
import { MentorshipCreateButton } from "@/components/mentorships/mentorship-create-button";
import { getMentorships } from "@/lib/queries/mentorships";

export const dynamic = "force-dynamic";

export default async function MentoriasPage() {
  const mentorships = await getMentorships();
  const ativas = mentorships.filter((m) => m.status === "ativa").length;

  return (
    <>
      <PageHeader
        title="Mentorias"
        description={`${mentorships.length} programas · ${ativas} ativos`}
        actions={<MentorshipCreateButton />}
      />
      <div className="p-8">
        <MentorshipsList mentorships={mentorships} />
      </div>
    </>
  );
}
