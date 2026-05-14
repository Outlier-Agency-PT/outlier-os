import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User as UserIcon, Building2, Rocket } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { TaskTimeTracker } from "@/components/tasks/task-time-tracker";
import { TaskComments } from "@/components/tasks/task-comments";
import { getTaskById } from "@/lib/queries/tasks";
import { getTaskTimeLogs, getTaskComments } from "@/lib/queries/task-detail";
import { PRIORITY_LABELS, PRIORITY_COLORS, type TaskPriority } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [task, timeLogs, comments] = await Promise.all([
    getTaskById(id),
    getTaskTimeLogs(id),
    getTaskComments(id),
  ]);
  if (!task) notFound();

  return (
    <>
      <PageHeader
        title={task.title}
        description={
          <span className="flex flex-wrap items-center gap-2 text-sm">
            {task.status && <StatusBadge label={task.status.label} color={task.status.color} />}
            {task.priority !== "sem_prioridade" && (
              <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority as TaskPriority]}`}>
                {PRIORITY_LABELS[task.priority as TaskPriority]}
              </span>
            )}
          </span>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/tarefas">
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
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {task.client && (
                <Row icon={Building2} label="Cliente" value={
                  <Link href={`/clientes/${task.client.id}`} className="text-primary hover:underline">
                    {task.client.name}
                  </Link>
                } />
              )}
              {task.launch_id && (
                <Row icon={Rocket} label="Lançamento" value={
                  <Link href={`/lancamentos/${task.launch_id}`} className="text-primary hover:underline">
                    Ver lançamento
                  </Link>
                } />
              )}
              {task.assignee && (
                <Row icon={UserIcon} label="Responsável" value={task.assignee.full_name} />
              )}
              {task.due_date && (
                <Row icon={Calendar} label="Data limite" value={formatDate(task.due_date)} />
              )}
              {task.completed_at && (
                <Row label="Concluída" value={formatDate(task.completed_at)} />
              )}
            </CardContent>
          </Card>

          {task.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{task.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <TaskTimeTracker taskId={task.id} timeLogs={timeLogs} />
        <TaskComments taskId={task.id} comments={comments} />
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
