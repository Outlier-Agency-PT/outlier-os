import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { getTasks, getTaskSpaces, getTasksByList } from "@/lib/queries/tasks";
import { getStatuses } from "@/lib/queries/statuses";
import { getClients } from "@/lib/queries/clients";
import { getTeamMembers } from "@/lib/queries/team";
import { getTaskTemplates } from "@/lib/queries/templates";

export const dynamic = "force-dynamic";

export default async function TarefasPage(props: {
  searchParams: Promise<{ list?: string }>;
}) {
  const searchParams = await props.searchParams;
  const selectedListId = searchParams.list;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const isAdmin = member?.role === "admin";
  const currentUserId = user?.id ?? "";

  // UUID da lista padrão "Backlog"
  const DEFAULT_LIST_ID = "00000000-0000-0000-0000-000000000011";
  const listId = selectedListId || DEFAULT_LIST_ID;

  const [tasks, statuses, clients, members, spaces, listTasks, templates] = await Promise.all([
    isAdmin ? getTasks() : getTasks({ assigneeId: currentUserId }),
    getStatuses("task_statuses"),
    getClients(),
    getTeamMembers(),
    getTaskSpaces(),
    getTasksByList(listId),
    getTaskTemplates(),
  ]);

  const rootCount = (tasks as any[]).filter((t) => !t.parent_task_id).length;
  const subCount = tasks.length - rootCount;
  const taskDesc =
    subCount > 0
      ? `${rootCount} ${rootCount === 1 ? "tarefa" : "tarefas"} · ${subCount} ${subCount === 1 ? "subtarefa" : "subtarefas"}`
      : `${tasks.length} ${tasks.length === 1 ? "tarefa" : "tarefas"}`;

  return (
    <>
      <PageHeader
        title="Tarefas"
        description={taskDesc}
      />
      <TasksBoard
        key={listId}
        initialTasks={listTasks}
        allTasks={tasks}
        statuses={statuses}
        clients={clients.map((c) => ({ id: c.id, label: c.name }))}
        members={members.map((m) => ({ id: m.id, label: m.full_name, email: m.email ?? "" }))}
        spaces={spaces}
        selectedListId={listId}
        templates={templates}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </>
  );
}
