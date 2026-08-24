import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { getTasks, getTaskSpaces, getTasksByList, getTasksBySpace } from "@/lib/queries/tasks";
import { getStatuses } from "@/lib/queries/statuses";
import { getClients } from "@/lib/queries/clients";
import { getTeamMembers } from "@/lib/queries/team";
import { getTaskTemplates } from "@/lib/queries/templates";

export const dynamic = "force-dynamic";

export default async function TarefasPage(props: {
  searchParams: Promise<{ list?: string; space?: string; assignee?: string }>;
}) {
  const searchParams = await props.searchParams;
  const selectedListId = searchParams.list;
  const selectedSpaceId = searchParams.space;
  const assigneeParam = searchParams.assignee;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const currentUserId = user?.id ?? "";

  // UUID da lista padrão "Backlog"
  const DEFAULT_LIST_ID = "00000000-0000-0000-0000-000000000011";
  const listId = selectedListId || DEFAULT_LIST_ID;

  // Correr em paralelo: member query + todos os queries independentes de isAdmin
  const [memberResult, statuses, clients, members, spaces, templates, listTasks] = await Promise.all([
    supabase.from("team_members").select("role").eq("id", currentUserId).maybeSingle(),
    getStatuses("task_statuses"),
    getClients(),
    getTeamMembers(),
    getTaskSpaces(),
    getTaskTemplates(),
    selectedSpaceId ? getTasksBySpace(selectedSpaceId) : getTasksByList(listId),
  ]);

  const isAdmin = memberResult.data?.role === "admin";

  // getTasks depende de isAdmin, corre após member resolver
  const tasks = await (isAdmin
    ? getTasks({ assigneeId: assigneeParam ?? undefined })
    : getTasks({ assigneeId: currentUserId }));

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
        key={selectedSpaceId ?? listId}
        initialTasks={listTasks}
        allTasks={tasks}
        statuses={statuses}
        clients={clients.map((c) => ({ id: c.id, label: c.name }))}
        members={members.map((m) => ({ id: m.id, label: m.full_name, email: m.email ?? "" }))}
        spaces={spaces}
        selectedListId={selectedSpaceId ? undefined : listId}
        selectedSpaceId={selectedSpaceId}
        templates={templates}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </>
  );
}
