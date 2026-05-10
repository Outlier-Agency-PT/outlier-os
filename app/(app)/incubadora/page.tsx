import { PageHeader } from "@/components/layout/page-header";
import { StudentsView } from "@/components/students/students-view";
import { getStudents } from "@/lib/queries/students";
import { getTeamMembers } from "@/lib/queries/team";

export const dynamic = "force-dynamic";

export default async function IncubadoraPage() {
  const [students, members] = await Promise.all([getStudents(), getTeamMembers()]);

  return (
    <>
      <PageHeader
        title="Incubadora"
        description={`${students.length} ${students.length === 1 ? "aluno" : "alunos"}`}
      />
      <StudentsView
        students={students}
        members={members.map((m) => ({ id: m.id, full_name: m.full_name }))}
      />
    </>
  );
}
