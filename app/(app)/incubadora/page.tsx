import { createClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/supabase/roles";
import { PageHeader } from "@/components/layout/page-header";
import { StudentsView } from "@/components/students/students-view";
import { ModulesPanel } from "@/components/incubadora/incubadora-components";
import { StudentView } from "@/components/incubadora/student-view";
import { getStudents, getPendingReminders } from "@/lib/queries/students";
import { StudentsROIDashboard } from "@/components/students/students-roi-dashboard";
import { IncubadoraDashboard } from "@/components/incubadora/incubadora-dashboard";
import { getTeamMembers } from "@/lib/queries/team";
import { getModulesWithLessonCount, getAllStudentsProgress, getStudentProgressDetail, getChallenges, getSuccessTracks, getStudentsDetailedProgress, getStudentProfile as getStudentProfileQuery } from "@/lib/queries/incubadora";

export const dynamic = "force-dynamic";

export default async function IncubadoraPage(props: {
  searchParams: Promise<{ section?: string }>;
}) {
  const searchParams = await props.searchParams;
  const section = searchParams.section || "metodo";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [roles, memberData] = await Promise.all([
    getUserRoles(),
    supabase.from("team_members").select("role").eq("id", user?.id ?? "").maybeSingle(),
  ]);

  const teamRole = memberData.data?.role as string | undefined;
  const isStaff =
    roles.includes("admin") ||
    roles.includes("funcionario") ||
    teamRole === "admin" ||
    teamRole === "membro";

  const isAluno = roles.includes("aluno") && !isStaff;

  if (isAluno && user) {
    const progressDetail = await getStudentProgressDetail(user.id);
    const challenges = await getChallenges(user.id);
    const successTracks = await getSuccessTracks(user.id, progressDetail, challenges);
    const studentProfile = await getStudentProfileQuery(user.id);

    const headerConfig = {
      metodo: { title: "Incubadora", description: "Minha área de aprendizagem" },
      ferramentas: { title: "Ferramentas", description: "Calculadora de Potencial de Lançamento" },
      assistentes: { title: "Assistentes", description: "Seu assistente de aprendizagem" },
    };

    const config = headerConfig[section as keyof typeof headerConfig] || headerConfig.metodo;

    if (section === "assistentes") {
      return (
        <>
          <PageHeader title={config.title} description={config.description} />
          <div style={{ padding: "2rem" }}>
            <h2>Assistentes</h2>
            <p>Newton o teu assistente de IA estará disponível em breve.</p>
          </div>
        </>
      );
    }

    return (
      <>
        <PageHeader title={config.title} description={config.description} />
        <StudentView
          modules={progressDetail.modules}
          emergencyCalls={progressDetail.emergency_calls}
          progressPct={progressDetail.progress_pct}
          studentId={user.id}
          challenges={challenges}
          successTracks={successTracks}
          section={section as "metodo" | "ferramentas" | "assistentes"}
          initialTicket={studentProfile.product_ticket ?? undefined}
          initialBudget={studentProfile.investment_budget ?? undefined}
        />
      </>
    );
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
      <div className="p-4 md:p-8">
        <IncubadoraDashboard />
      </div>
      <ModulesPanel modules={modules} />
      <StudentsView
        students={students}
        members={members.map((m) => ({ id: m.id, full_name: m.full_name }))}
        progressMap={progressMap}
        detailedProgressMap={detailedProgressMap}
        pendingReminders={pendingReminders}
      />
      <StudentsROIDashboard />
    </>
  );
}
