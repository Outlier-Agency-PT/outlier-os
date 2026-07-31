import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProcessById, getChecklistProgress, getProcessCategories } from "@/lib/queries/processes";
import { getTeamMembers } from "@/lib/queries/team";
import { extractHeadings } from "@/lib/utils/extract-headings";
import { extractChecklistItems } from "@/lib/utils/extract-checklist-items";
import { TableOfContents } from "@/components/processes/table-of-contents";
import { ChecklistView } from "@/components/processes/checklist-view";
import { DecisionView } from "@/components/processes/decision-view";
import { PlaybookView } from "@/components/processes/playbook-view";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { DecisionData } from "@/lib/actions/processes";
import { DeleteProcessButton } from "@/components/processes/delete-process-button";
import { EditProcessButton } from "@/components/processes/edit-process-button";
import { UseTemplateButton } from "@/components/processes/use-template-button";
import { fetchTaskListsAction } from "@/lib/actions/tasks";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default async function ProcessDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [process, categories, members, rawLists] = await Promise.all([
    getProcessById(id),
    getProcessCategories(),
    getTeamMembers(),
    fetchTaskListsAction(),
  ]);
  const lists = "data" in rawLists
    ? rawLists.data.flatMap((space) =>
        space.lists.map((l) => ({
          id: l.id,
          name: l.name,
          spaceName: space.spaceName,
        }))
      )
    : [];
  if (!process) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? "";

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", currentUserId)
    .maybeSingle();

  const isAdmin = member?.role === "admin";
  const isOwner = process.created_by === currentUserId;
  const canManage = isAdmin || isOwner;

  const isChecklist = process.doc_type === "checklist";
  const isDecision = process.doc_type === "decisao";
  const isPlaybook = process.doc_type === "playbook";
  const isTemplate = process.doc_type === "template";
  const checklistItems = isChecklist ? extractChecklistItems(process.content_md) : [];
  const completedIndexes = isChecklist && currentUserId
    ? await getChecklistProgress(process.id, currentUserId)
    : [];

  const headings = extractHeadings(process.content_md);
  const hasToc =
    !isChecklist &&
    !isDecision &&
    !isPlaybook &&
    (process.doc_type === "guia" || process.doc_type === "processo") &&
    headings.length >= 3;

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
          <div className="flex items-center gap-2">
            {isTemplate && process.template_target && (
              <UseTemplateButton
                process={process}
                lists={lists}
                members={members}
              />
            )}
            {canManage && (
            <>
              <EditProcessButton
                process={process}
                categories={categories}
                members={members}
              />
              <DeleteProcessButton processId={process.id} />
            </>
          )}
            <Button variant="outline" asChild>
              <Link href="/processos">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
          </div>
        }
      />

      <div
        className={cn(
          "p-8",
          hasToc ? "grid grid-cols-[220px_1fr] gap-8 items-start" : "space-y-6",
        )}
      >
        {hasToc && <TableOfContents headings={headings} />}

        <div className="space-y-6 min-w-0">
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
              {isDecision ? (
                process.decision_data ? (
                  <DecisionView data={process.decision_data as DecisionData} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sem dados de decisão registados.
                  </p>
                )
              ) : isPlaybook ? (
                process.content_md ? (
                  <PlaybookView
                    content={process.content_md}
                    version={process.version}
                    lastReviewedAt={process.last_reviewed_at}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Sem conteúdo.</p>
                )
              ) : isChecklist ? (
                checklistItems.length > 0 ? (
                  <ChecklistView
                    processId={process.id}
                    items={checklistItems}
                    completedIndexes={completedIndexes}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum item encontrado. Adiciona itens com "- item" no conteúdo.
                  </p>
                )
              ) : process.content_md ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({ children }) => (
                        <h2 id={slugify(String(children))}>{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 id={slugify(String(children))}>{children}</h3>
                      ),
                    }}
                  >
                    {process.content_md}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem conteúdo.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
