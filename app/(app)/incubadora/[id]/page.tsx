import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudentById, getStudentBriefing } from "@/lib/queries/students";
import { getUserRoles } from "@/lib/supabase/roles";
import { createClient } from "@/lib/supabase/server";
import { StudentDetailClient } from "@/components/students/student-detail-client";
import { getStudentProgressDetail } from "@/lib/queries/incubadora";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ student, sessions, checklist, notes }, roles, briefing, memberData] = await Promise.all([
    getStudentById(id),
    getUserRoles(),
    getStudentBriefing(id),
    supabase.from("team_members").select("role").eq("id", user?.id ?? "").maybeSingle(),
  ]);

  if (!student) notFound();

  const teamRole = memberData.data?.role as string | undefined;
  const isStaff =
    roles.includes("admin") ||
    roles.includes("funcionario") ||
    teamRole === "admin" ||
    teamRole === "membro";

  const progressDetail = student.user_id
    ? await getStudentProgressDetail(student.user_id)
    : null;

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
      />
    </>
  );
}
