import { createClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/supabase/roles";
import { PageHeader } from "@/components/layout/page-header";
import { StudentsView } from "@/components/students/students-view";
import { ModulesPanel } from "@/components/incubadora/incubadora-components";
import { StudentView } from "@/components/incubadora/student-view";
import { getStudents, getPendingReminders } from "@/lib/queries/students";
import { getTeamMembers } from "@/lib/queries/team";
import { getModulesWithLessonCount, getAllStudentsProgress, getStudentProgressDetail, getChallenges, getSuccessTracks, getStudentsDetailedProgress } from "@/lib/queries/incubadora";

export const dynamic = "force-dynamic";

export default async function IncubadoraPage(props: {
  searchParams: Promise<{ section?: string }>;
}) {
  const searchParams = await props.searchParams;
  const section = searchParams.section || "metodo";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const roles = await getUserRoles();

  const isAluno = roles.includes("aluno") && !roles.includes("admin") && !roles.includes("funcionario");

  if (isAluno && user) {
    if (section === "metodo") {
      const progressDetail = await getStudentProgressDetail(user.id);
      const challenges = await getChallenges(user.id);
      const successTracks = await getSuccessTracks(user.id, progressDetail, challenges);
      return (
        <>
          <PageHeader title="Incubadora" description="Minha área de aprendizagem" />
          <StudentView
            modules={progressDetail.modules}
            emergencyCalls={progressDetail.emergency_calls}
            progressPct={progressDetail.progress_pct}
            studentId={user.id}
            challenges={challenges}
            successTracks={successTracks}
          />
        </>
      );
    }

    if (section === "ferramentas") {
      return (
        <>
          <PageHeader title="Ferramentas" description="Recursos e ferramentas" />
          <div className="flex items-center justify-center min-h-96">
            <p className="text-muted-foreground">Em breve...</p>
          </div>
        </>
      );
    }

    if (section === "assistentes") {
      return (
        <>
          <PageHeader title="Assistentes" description="Seu assistente de aprendizagem" />
          <div className="flex items-center justify-center min-h-96">
            <p className="text-muted-foreground">Em breve...</p>
          </div>
        </>
      );
    }
  }

  const [students, members, modules, pendingReminders] = await Promise.all([
    getStudents(),
    getTeamMembers(),
    getModulesWithLessonCount(),
    getPendingReminders(),
  ]);

  const totalLessons = modules.reduce((sum, m) => sum + m.lesson_count, 0);
  const [progressMap, detailedProgressMap] = await Promise.all([
    getAllStudentsProgress(totalLessons),
    getStudentsDetailedProgress(),
  ]);

  return (
    <>
      <PageHeader
        title="Incubadora"
        description={`${students.length} ${students.length === 1 ? "aluno" : "alunos"}`}
      />
      <ModulesPanel modules={modules} />
      <StudentsView
        students={students}
        members={members.map((m) => ({ id: m.id, full_name: m.full_name }))}
        progressMap={progressMap}
        detailedProgressMap={detailedProgressMap}
        pendingReminders={pendingReminders}
      />
    </>
  );
}
