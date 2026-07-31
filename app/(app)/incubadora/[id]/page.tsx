import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudentById, getStudentBriefing, getStudentDiary } from "@/lib/queries/students";
import { getUserRoles } from "@/lib/supabase/roles";
import { createClient } from "@/lib/supabase/server";
import { StudentDetailClient } from "@/components/students/student-detail-client";
import { getStudentProgressDetail } from "@/lib/queries/incubadora";
import { getMeetingsByStudent, getMeetings } from "@/lib/queries/meetings";
import { getStudentReports } from "@/lib/queries/student-reports";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const VALID_TABS = ["visao-geral", "acompanhamento", "diario", "reunioes", "relatorios"];

export default async function StudentDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ student, sessions, checklist, notes }, roles, briefing, memberData, diary] =
    await Promise.all([
      getStudentById(id),
      getUserRoles(),
      getStudentBriefing(id),
      supabase.from("team_members").select("role").eq("id", user?.id ?? "").maybeSingle(),
      getStudentDiary(id),
    ]);

  if (!student) notFound();

  const teamRole = memberData.data?.role as string | undefined;
  const isStaff =
    roles.includes("admin") ||
    roles.includes("funcionario") ||
    teamRole === "admin" ||
    teamRole === "membro";

  const isStudentOwner = !!user && !!student.user_id && user.id === student.user_id;

  const [progressDetail, studentMeetings, allMeetings, studentReports] = await Promise.all([
    student.user_id ? getStudentProgressDetail(student.user_id) : null,
    getMeetingsByStudent(id),
    isStaff ? getMeetings() : [],
    getStudentReports(id),
  ]);

  // Protege a tab "acompanhamento" de ser acessível por alunos via URL
  const rawTab = sp.tab ?? "visao-geral";
  const initialTab =
    VALID_TABS.includes(rawTab) && (rawTab !== "acompanhamento" || isStaff)
      ? rawTab
      : "visao-geral";

  return (
    <>
      <PageHeader
        title={student.name}
        description={
          <span className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{student.level}</Badge>
            {student.coach && (
              <span className="text-muted-foreground">Coach: {student.coach.full_name}</span>
            )}
            {student.turma && <span className="text-muted-foreground">· {student.turma}</span>}
          </span>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/incubadora">
              <ArrowLeft />
              Voltar
            </Link>
          </Button>
        }
      />

      <StudentDetailClient
        studentId={id}
        student={student}
        sessions={sessions}
        initialChecklist={checklist}
        initialNotes={notes}
        isStaff={isStaff}
        initialBriefing={briefing}
        progressDetail={progressDetail}
        initialDiary={diary}
        initialMeetings={studentMeetings}
        allMeetings={allMeetings}
        initialTab={initialTab}
        isStudentOwner={isStudentOwner}
        initialReports={studentReports}
      />
    </>
  );
}
