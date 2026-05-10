import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, AtSign } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudentById } from "@/lib/queries/students";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { student, sessions } = await getStudentById(id);
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

      <div className="space-y-6 p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {student.nicho && <Row label="Nicho" value={student.nicho} />}
              {student.subnicho && <Row label="Subnicho" value={student.subnicho} />}
              {student.entry_type && <Row label="Tipo de entrada" value={student.entry_type} />}
              {student.start_date && <Row label="Início" value={formatDate(student.start_date)} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contactos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {student.email && <Row icon={Mail} label="Email" value={student.email} />}
              {student.phone && <Row icon={Phone} label="Telefone" value={student.phone} />}
              {student.instagram && <Row icon={AtSign} label="Instagram" value={student.instagram} />}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline de Sessões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              {sessions.map((s) => (
                <div key={s.id} className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.type.label}
                  </p>
                  {s.completed_at ? (
                    <Badge variant="default" className="mt-2 text-[10px]">Concluída</Badge>
                  ) : s.scheduled_date ? (
                    <Badge variant="secondary" className="mt-2 text-[10px]">Agendada</Badge>
                  ) : (
                    <Badge variant="outline" className="mt-2 text-[10px]">Pendente</Badge>
                  )}
                  {s.scheduled_date && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatDate(s.scheduled_date)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {student.briefing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Briefing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{student.briefing}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="mt-0.5 size-4 text-muted-foreground" />}
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words">{value}</p>
      </div>
    </div>
  );
}
