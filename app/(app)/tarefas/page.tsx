import { PageHeader } from "@/components/layout/page-header";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { getTasks } from "@/lib/queries/tasks";
import { getStatuses } from "@/lib/queries/statuses";
import { getClients } from "@/lib/queries/clients";
import { getTeamMembers } from "@/lib/queries/team";

export const dynamic = "force-dynamic";

export default async function TarefasPage() {
  const [tasks, statuses, clients, members] = await Promise.all([
    getTasks(),
    getStatuses("task_statuses"),
    getClients(),
    getTeamMembers(),
  ]);

  return (
    <>
      <PageHeader
        title="Tarefas"
        description={`${tasks.length} ${tasks.length === 1 ? "tarefa" : "tarefas"}`}
      />
      <TasksBoard
        tasks={tasks}
        statuses={statuses}
        clients={clients.map((c) => ({ id: c.id, label: c.name }))}
        members={members.map((m) => ({ id: m.id, label: m.full_name }))}
      />
    </>
  );
}
