import { getTasks, getTaskSpaces } from "@/lib/queries/tasks";
import { getStatuses } from "@/lib/queries/statuses";
import { getTeamMembers } from "@/lib/queries/team";
import { PageHeader } from "@/components/layout/page-header";
import { GlobalCalendarView } from "./calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const [tasks, spaces, statuses, members] = await Promise.all([
    getTasks(),
    getTaskSpaces(),
    getStatuses("task_statuses"),
    getTeamMembers(),
  ]);

  const withDateCount = tasks.filter((t) => t.due_date).length;

  return (
    <>
      <PageHeader
        title="Calendário"
        description={`${withDateCount} ${withDateCount === 1 ? "tarefa" : "tarefas"} com data`}
      />
      <GlobalCalendarView
        tasks={tasks}
        spaces={spaces}
        statuses={statuses}
        members={members.map((m) => ({ id: m.id, full_name: m.full_name }))}
      />
    </>
  );
}
