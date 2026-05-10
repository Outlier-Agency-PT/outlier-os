import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Globe, Calendar } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ShareToggle } from "@/components/clients/share-toggle";
import { getClientById } from "@/lib/queries/clients";
import { getTasks } from "@/lib/queries/tasks";
import { getContents } from "@/lib/queries/contents";
import { getLaunches } from "@/lib/queries/launches";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const [tasks, contents, allLaunches] = await Promise.all([
    getTasks({ clientId: id }),
    getContents({ clientId: id }),
    getLaunches(),
  ]);
  const launches = allLaunches.filter((l) => l.client_id === id);
  const openTasks = tasks.filter((t) => t.status?.key !== "concluido").length;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <>
      <PageHeader
        title={client.name}
        description={
          <span className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {CLIENT_TYPE_LABELS[client.client_type as ClientType]}
            </Badge>
            {client.status && (
              <StatusBadge label={client.status.label} color={client.status.color} />
            )}
          </span>
        }
        actions={
          <>
            <ShareToggle
              clientId={client.id}
              shareToken={client.public_share_token}
              enabled={client.public_share_enabled}
              appUrl={appUrl}
            />
            <Button variant="outline" asChild>
              <Link href="/clientes">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-6 p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Tarefas Abertas" value={openTasks} />
          <Kpi label="Lançamentos" value={launches.length} />
          <Kpi label="Conteúdos" value={contents.length} />
          <Kpi
            label="Valor Mensal"
            value={client.monthly_value !== null ? formatCurrency(client.monthly_value) : "—"}
          />
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas ({tasks.length})</TabsTrigger>
            <TabsTrigger value="lancamentos">Lançamentos ({launches.length})</TabsTrigger>
            <TabsTrigger value="conteudo">Conteúdo ({contents.length})</TabsTrigger>
            <TabsTrigger value="reunioes">Reuniões</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {client.email && <Row icon={Mail} label="Email" value={client.email} />}
                  {client.phone && <Row icon={Phone} label="Telefone" value={client.phone} />}
                  {client.website && (
                    <Row
                      icon={Globe}
                      label="Website"
                      value={
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {client.website}
                        </a>
                      }
                    />
                  )}
                  {client.sector && <Row label="Sector" value={client.sector} />}
                  {client.responsible && (
                    <Row label="Responsável" value={client.responsible.full_name} />
                  )}
                  {client.start_date && (
                    <Row icon={Calendar} label="Início" value={formatDate(client.start_date)} />
                  )}
                  {client.notes && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-muted-foreground">Notas</p>
                      <p className="mt-1 whitespace-pre-wrap">{client.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  {tasks.length === 0 && launches.length === 0 && contents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem atividade ainda.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {tasks.slice(0, 3).map((t) => (
                        <li key={`t-${t.id}`}>
                          <span className="text-muted-foreground">Tarefa:</span> {t.title}
                        </li>
                      ))}
                      {launches.slice(0, 3).map((l) => (
                        <li key={`l-${l.id}`}>
                          <span className="text-muted-foreground">Lançamento:</span> {l.name}
                        </li>
                      ))}
                      {contents.slice(0, 3).map((c) => (
                        <li key={`c-${c.id}`}>
                          <span className="text-muted-foreground">Conteúdo:</span> {c.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tarefas">
            <Card>
              <CardContent className="p-6">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem tarefas neste cliente.</p>
                ) : (
                  <ul className="divide-y">
                    {tasks.slice(0, 20).map((t) => (
                      <li key={t.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">{t.title}</p>
                          {t.assignee && (
                            <p className="text-xs text-muted-foreground">{t.assignee.full_name}</p>
                          )}
                        </div>
                        {t.status && <StatusBadge label={t.status.label} color={t.status.color} />}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lancamentos">
            <Card>
              <CardContent className="p-6">
                {launches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem lançamentos.</p>
                ) : (
                  <ul className="divide-y">
                    {launches.map((l) => (
                      <li key={l.id} className="flex items-center justify-between py-2">
                        <Link href={`/lancamentos/${l.id}`} className="font-medium hover:underline">
                          {l.name}
                        </Link>
                        {l.status && <StatusBadge label={l.status.label} color={l.status.color} />}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conteudo">
            <Card>
              <CardContent className="p-6">
                {contents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem conteúdos.</p>
                ) : (
                  <ul className="divide-y">
                    {contents.map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">{c.name}</p>
                          {c.format && (
                            <p className="text-xs text-muted-foreground">{c.format}</p>
                          )}
                        </div>
                        {c.status && <StatusBadge label={c.status.label} color={c.status.color} />}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reunioes">
            <Placeholder text="Reuniões disponível em Sprint 4." />
          </TabsContent>
          <TabsContent value="relatorios">
            <Placeholder text="Relatórios disponível em Sprint 3." />
          </TabsContent>
          <TabsContent value="feedback">
            <Placeholder text="Feedback inline disponível em Sprint 4. Por agora, vê via dashboard partilhado." />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
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

function Placeholder({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-12 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}
