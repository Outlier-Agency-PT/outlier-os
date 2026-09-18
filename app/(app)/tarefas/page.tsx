import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { getTasks, getTaskSpaces, getTasksByList, getTasksBySpace, getPendingApprovalTasks } from "@/lib/queries/tasks";
import { getStatuses } from "@/lib/queries/statuses";
import { getClients } from "@/lib/queries/clients";
import { getTeamMembers } from "@/lib/queries/team";
import { getTaskTemplates } from "@/lib/queries/templates";
import { PendingApprovalBanner } from "@/components/tasks/pending-approval-banner";

export const dynamic = "force-dynamic";

export default async function TarefasPage(props: {
  searchParams: Promise<{ list?: string; space?: string; assignee?: string; unassigned?: string; pendingApproval?: string }>;
}) {
  const searchParams = await props.searchParams;
  const selectedListId = searchParams.list;
  const selectedSpaceId = searchParams.space;
  const assigneeParam = searchParams.assignee;
  const unassignedParam = searchParams.unassigned === "true";
  const pendingApprovalParam = searchParams.pendingApproval === "true";

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

  // getTasks e getPendingApprovalTasks dependem de isAdmin, correm após member resolver
  const [tasks, pendingApprovalTasks] = await Promise.all([
    isAdmin
      ? getTasks(unassignedParam ? { unassigned: true } : { assigneeId: assigneeParam ?? undefined })
      : getTasks({ assigneeId: currentUserId }),
    currentUserId ? getPendingApprovalTasks(currentUserId, isAdmin) : Promise.resolve([]),
  ]);

  const rootCount = (tasks as any[]).filter((t) => !t.parent_task_id).length;
  const subCount = tasks.length - rootCount;
  const taskDesc =
    subCount > 0
      ? `${rootCount} ${rootCount === 1 ? "tarefa" : "tarefas"} · ${subCount} ${subCount === 1 ? "subtarefa" : "subtarefas"}`
      : `${tasks.length} ${tasks.length === 1 ? "tarefa" : "tarefas"}`;

  const membersList = members.map((m) => ({ id: m.id, label: m.full_name }));

  return (
    <>
      <PageHeader
        title="Tarefas"
        description={taskDesc}
      />
      {pendingApprovalTasks.length > 0 && (
        <div className="px-4 pt-4 md:px-8">
          <PendingApprovalBanner
            tasks={pendingApprovalTasks}
            members={membersList}
            autoOpen={pendingApprovalParam || pendingApprovalTasks.length > 0}
          />
        </div>
      )}
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
        initialUnassigned={isAdmin && unassignedParam}
      />
    </>
  );
}
