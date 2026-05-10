import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProcessById } from "@/lib/queries/processes";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProcessDetailPage({ params }: PageProps) {
  const { id } = await params;
  const process = await getProcessById(id);
  if (!process) notFound();

  return (
    <>
      <PageHeader
        title={process.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {process.category && (
              <Badge
                variant="outline"
                style={{ borderColor: process.category.color, color: process.category.color }}
              >
                {process.category.label}
              </Badge>
            )}
            {process.tags?.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {t}
              </Badge>
            ))}
            {!process.published && <Badge variant="secondary">Rascunho</Badge>}
          </span>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/processos">
              <ArrowLeft />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="space-y-6 p-8">
        {process.description && (
          <p className="text-base text-muted-foreground">{process.description}</p>
        )}

        {process.miro_link && (
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Miro Board</p>
                <p className="text-sm font-medium">{process.miro_link}</p>
              </div>
              <Button variant="outline" asChild>
                <a href={process.miro_link} target="_blank" rel="noopener noreferrer">
                  Abrir
                  <ExternalLink />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            {process.content_md ? (
              <pre className="whitespace-pre-wrap font-mono text-sm">{process.content_md}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">Sem conteúdo.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
