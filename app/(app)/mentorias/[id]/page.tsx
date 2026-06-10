import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MentorshipModules } from "@/components/mentorships/mentorship-modules";
import { MentorshipActions } from "@/components/mentorships/mentorship-actions";
import {
  getMentorshipById,
  getMentorshipModules,
  getImplementationActions,
} from "@/lib/queries/mentorships";
import { MENTORSHIP_STATUS_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MentoriaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [mentorship, modules, actions] = await Promise.all([
    getMentorshipById(id),
    getMentorshipModules(id),
    getImplementationActions(id),
  ]);
  if (!mentorship) notFound();

  return (
    <>
      <PageHeader
        title={`${mentorship.cover_emoji} ${mentorship.name}`}
        description={
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" className="text-[10px]">
              {MENTORSHIP_STATUS_LABELS[mentorship.status]}
            </Badge>
            {mentorship.mentor && (
              <span className="text-muted-foreground">por {mentorship.mentor}</span>
            )}
            {mentorship.platform && (
              <span className="text-muted-foreground">· {mentorship.platform}</span>
            )}
            {mentorship.started_at && (
              <span className="text-muted-foreground">
                · desde {new Date(mentorship.started_at).toLocaleDateString("pt-PT")}
              </span>
            )}
          </span>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/mentorias">
              <ArrowLeft />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="space-y-6 p-8">
        {(mentorship.description || mentorship.url) && (
          <Card>
            <CardContent className="space-y-2 p-5 text-sm">
              {mentorship.description && (
                <p className="whitespace-pre-wrap">{mentorship.description}</p>
              )}
              {mentorship.url && (
                <a
                  href={mentorship.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  Abrir
                </a>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <MentorshipModules mentorshipId={id} modules={modules} />
          <MentorshipActions mentorshipId={id} actions={actions} modules={modules} />
        </div>

        {mentorship.notes && (
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notas gerais
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{mentorship.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
