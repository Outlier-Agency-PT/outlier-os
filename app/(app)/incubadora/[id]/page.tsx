import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudentById } from "@/lib/queries/students";
import { StudentDetailClient } from "@/components/students/student-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { student, sessions, checklist, notes } = await getStudentById(id);

  if (!student) notFound();

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
      />
    </>
  );
}
