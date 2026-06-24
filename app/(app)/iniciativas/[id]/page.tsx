import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertCircle, Star, Flag } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getInitiativeById,
  getInitiativeUpdates,
} from "@/lib/queries/initiatives";
import { getTeamMembers } from "@/lib/queries/team";
import { getClients } from "@/lib/queries/clients";
import { getMentorships } from "@/lib/queries/mentorships";
import { InitiativeEditButton } from "@/components/initiatives/initiative-edit-button";
import { InitiativeToggles } from "@/components/initiatives/initiative-toggles";
import {
  INITIATIVE_STATUS_LABELS,
  INITIATIVE_STATUS_COLORS,
  INITIATIVE_PRIORITY_LABELS,
  INITIATIVE_SOURCE_LABELS,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function IniciativaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [initiative, updates, members, clients, mentorships] = await Promise.all([
    getInitiativeById(id),
    getInitiativeUpdates(id),
    getTeamMembers(),
    getClients(),
    getMentorships(),
  ]);

  if (!initiative) notFound();

  return (
    <>
      <Link
        href="/iniciativas"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3" />
        Voltar a Iniciativas
      </Link>

      <PageHeader
        title={initiative.title}
        description={initiative.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <InitiativeToggles
              id={initiative.id}
              focusThisWeek={initiative.focus_this_week}
              needsDecision={initiative.needs_decision}
              size="md"
            />
            <InitiativeEditButton
              initiative={{
                id: initiative.id,
                title: initiative.title,
                description: initiative.description,
                status: initiative.status,
                priority: initiative.priority,
                source: initiative.source,
                health: initiative.health,
                owner_id: initiative.owner_id,
                next_step: initiative.next_step,
                blocker: initiative.blocker,
                focus_this_week: initiative.focus_this_week,
                needs_decision: initiative.needs_decision,
                decision_context: initiative.decision_context,
                expected_impact: initiative.expected_impact,
                expected_effort: initiative.expected_effort,
                client_id: initiative.client_id,
                mentorship_id: initiative.mentorship_id,
                start_date: initiative.start_date,
                target_date: initiative.target_date,
                tags: initiative.tags,
              }}
              members={members.map((m) => ({ id: m.id, full_name: m.full_name }))}
              clients={clients.map((c) => ({ id: c.id, name: c.name }))}
              mentorships={mentorships.map((m) => ({ id: m.id, name: m.name }))}
            />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {(initiative.focus_this_week || initiative.needs_decision) && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="space-y-2 p-4">
                {initiative.focus_this_week && (
                  <p className="flex items-center gap-2 text-sm">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium">Foco da Semana</span>
                  </p>
                )}
                {initiative.needs_decision && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">Precisa de decisão tua</p>
                      {initiative.decision_context && (
                        <p className="text-xs text-muted-foreground">
                          {initiative.decision_context}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {initiative.next_step && (
            <Card>
              <CardContent className="p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Próximo passo
                </p>
                <p className="text-sm">{initiative.next_step}</p>
              </CardContent>
            </Card>
          )}

          {initiative.blocker && (
            <Card className="border-red-500/40 bg-red-500/5">
              <CardContent className="p-4">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-red-500">
                  <Flag className="size-3" /> Bloqueador
                </p>
                <p className="text-sm">{initiative.blocker}</p>
              </CardContent>
            </Card>
          )}

          {updates.length > 0 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Updates ({updates.length})
                </h3>
                {updates.map((u) => (
                  <div key={u.id} className="border-l-2 border-muted pl-3">
                    <p className="text-sm">{u.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleString("pt-PT")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4 text-sm">
              <Row label="Status">
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", INITIATIVE_STATUS_COLORS[initiative.status])}
                >
                  {INITIATIVE_STATUS_LABELS[initiative.status]}
                </Badge>
              </Row>
              <Row label="Prioridade">
                {INITIATIVE_PRIORITY_LABELS[initiative.priority]}
              </Row>
              <Row label="Origem">{INITIATIVE_SOURCE_LABELS[initiative.source]}</Row>
              {initiative.owner && <Row label="Owner">{initiative.owner.full_name}</Row>}
              {initiative.client && <Row label="Cliente">{initiative.client.name}</Row>}
              {initiative.mentorship && (
                <Row label="Mentoria">{initiative.mentorship.name}</Row>
              )}
              {initiative.expected_impact && (
                <Row label="Impacto esperado">{initiative.expected_impact}</Row>
              )}
              {initiative.expected_effort && (
                <Row label="Esforço">{initiative.expected_effort}</Row>
              )}
              {initiative.start_date && (
                <Row label="Início">
                  {new Date(initiative.start_date).toLocaleDateString("pt-PT")}
                </Row>
              )}
              {initiative.target_date && (
                <Row label="Alvo">
                  {new Date(initiative.target_date).toLocaleDateString("pt-PT")}
                </Row>
              )}
              {initiative.tags && initiative.tags.length > 0 && (
                <Row label="Tags">
                  <span className="flex flex-wrap gap-1">
                    {initiative.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </span>
                </Row>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}
