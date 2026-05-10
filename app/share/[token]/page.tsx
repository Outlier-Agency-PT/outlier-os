import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShareFeedbackForm } from "@/components/share/share-feedback-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  // Buscar cliente pelo token
  const { data: clientRaw } = await supabase
    .from("clients")
    .select(
      `
      *,
      status:client_statuses(label, color),
      responsible:team_members!clients_responsible_id_fkey(full_name)
      `,
    )
    .eq("public_share_token", token)
    .eq("public_share_enabled", true)
    .maybeSingle();

  if (!clientRaw) notFound();
  // Flatten nested arrays from supabase joins
  const client = {
    ...clientRaw,
    status: Array.isArray(clientRaw.status) ? clientRaw.status[0] ?? null : clientRaw.status,
    responsible: Array.isArray(clientRaw.responsible)
      ? clientRaw.responsible[0] ?? null
      : clientRaw.responsible,
  } as {
    id: string;
    name: string;
    sector: string | null;
    monthly_value: number | null;
    status: { label: string; color: string } | null;
    responsible: { full_name: string } | null;
  };

  // Tarefas (excluir concluídas + arquivadas)
  const { data: tasksRaw } = await supabase
    .from("tasks")
    .select(
      `
      id, title, due_date, priority,
      status:task_statuses(key, label, color)
      `,
    )
    .eq("client_id", client.id)
    .order("due_date", { ascending: true, nullsFirst: false });

  type ShareTask = {
    id: string;
    title: string;
    due_date: string | null;
    priority: string;
    status: { key: string; label: string; color: string } | null;
  };
  // Supabase returns nested as array; flatten to single
  const tasks: ShareTask[] = (tasksRaw ?? []).map((t: { id: string; title: string; due_date: string | null; priority: string; status: { key: string; label: string; color: string } | { key: string; label: string; color: string }[] | null }) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    priority: t.priority,
    status: Array.isArray(t.status) ? t.status[0] ?? null : t.status,
  })).filter((t: ShareTask) => t.status?.key !== "concluido");

  // Conteúdos publicados
  const { data: publishedStatus } = await supabase
    .from("content_statuses")
    .select("id")
    .eq("key", "publicado")
    .maybeSingle();

  let publishedContents: Array<{
    id: string;
    name: string;
    format: string | null;
    publish_date: string | null;
    platforms: string[] | null;
  }> = [];
  if (publishedStatus) {
    const { data } = await supabase
      .from("contents")
      .select("id, name, format, publish_date, platforms")
      .eq("client_id", client.id)
      .eq("status_id", (publishedStatus as { id: string }).id)
      .order("publish_date", { ascending: false });
    publishedContents = (data ?? []) as typeof publishedContents;
  }

  // Relatórios publicados
  const { data: reports } = await supabase
    .from("reports")
    .select("id, type, period_start, period_end, content_md, published_at")
    .eq("client_id", client.id)
    .eq("status", "publicado")
    .order("period_end", { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Dashboard partilhado
              </p>
              <h1 className="mt-1 text-3xl font-bold">{client.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {client.status && <StatusBadge label={client.status.label} color={client.status.color} />}
                {client.sector && <Badge variant="outline">{client.sector}</Badge>}
                {client.responsible && (
                  <span className="text-xs text-muted-foreground">
                    Responsável: {client.responsible.full_name}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                OUTLIER <span className="text-primary">OS</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tarefas Ativas</p>
              <p className="mt-1 text-3xl font-bold">{tasks?.length ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Conteúdos Publicados</p>
              <p className="mt-1 text-3xl font-bold">{publishedContents.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor mensal</p>
              <p className="mt-1 text-3xl font-bold">
                {client.monthly_value !== null ? formatCurrency(client.monthly_value) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tarefas em curso */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Em curso</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <ul className="divide-y">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      {t.due_date && (
                        <p className="text-xs text-muted-foreground">Limite: {formatDate(t.due_date)}</p>
                      )}
                    </div>
                    {t.status && <StatusBadge label={t.status.label} color={t.status.color} />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sem tarefas ativas.</p>
            )}
          </CardContent>
        </Card>

        {/* Conteúdos publicados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conteúdos publicados</CardTitle>
          </CardHeader>
          <CardContent>
            {publishedContents.length > 0 ? (
              <ul className="divide-y">
                {publishedContents.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        {c.format && <span>{c.format}</span>}
                        {c.platforms && c.platforms.length > 0 && (
                          <span>· {c.platforms.join(", ")}</span>
                        )}
                      </div>
                    </div>
                    {c.publish_date && (
                      <span className="text-xs text-muted-foreground">{formatDate(c.publish_date)}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sem conteúdos publicados.</p>
            )}
          </CardContent>
        </Card>

        {/* Relatórios */}
        {reports && reports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relatórios</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {(reports as Array<{ id: string; type: string; period_start: string; period_end: string; content_md: string | null }>).map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium capitalize">
                        Relatório {r.type} ({formatDate(r.period_start)} → {formatDate(r.period_end)})
                      </p>
                    </div>
                    {r.content_md && (
                      <div className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">
                        {r.content_md.slice(0, 500)}
                        {r.content_md.length > 500 && "..."}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Feedback do cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deixar feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareFeedbackForm clientId={client.id} />
          </CardContent>
        </Card>

        <p className="pt-4 text-center text-xs text-muted-foreground">
          Powered by Outlier OS · {client.name}
        </p>
      </div>
    </div>
  );
}
