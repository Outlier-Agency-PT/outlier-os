import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getLaunchById } from "@/lib/queries/launches";
import { getTasks } from "@/lib/queries/tasks";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LaunchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const launch = await getLaunchById(id);
  if (!launch) notFound();

  const tasks = await getTasks();
  const launchTasks = tasks.filter((t) => t.launch_id === id);
  const completed = launchTasks.filter((t) => t.status?.key === "concluido").length;
  const progress = launchTasks.length ? Math.round((completed / launchTasks.length) * 100) : 0;

  return (
    <>
      <PageHeader
        title={launch.name}
        description={
          <span className="flex items-center gap-2">
            {launch.status && <StatusBadge label={launch.status.label} color={launch.status.color} />}
            {launch.tier && <Badge variant="outline">{launch.tier}</Badge>}
            {launch.client && <span className="text-sm text-muted-foreground">· {launch.client.name}</span>}
          </span>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/lancamentos">
              <ArrowLeft />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="space-y-6 p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Progresso</p>
              <p className="mt-1 text-2xl font-bold">{progress}%</p>
              <p className="mt-1 text-xs text-muted-foreground">{completed}/{launchTasks.length} tarefas</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-2 p-5">
              <Calendar className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Período</p>
                <p className="mt-1 text-sm font-medium">
                  {launch.start_date ? formatDate(launch.start_date) : "—"} →{" "}
                  {launch.end_date ? formatDate(launch.end_date) : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-2 p-5">
              <User className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
                <p className="mt-1 text-sm font-medium">{launch.client?.name ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {launch.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{launch.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarefas ({launchTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {launchTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem tarefas associadas.</p>
            ) : (
              <ul className="divide-y">
                {launchTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      {t.assignee && (
                        <p className="text-xs text-muted-foreground">{t.assignee.full_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.due_date && (
                        <span className="text-xs text-muted-foreground">{formatDate(t.due_date)}</span>
                      )}
                      {t.status && <StatusBadge label={t.status.label} color={t.status.color} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
