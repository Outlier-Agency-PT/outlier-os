import { MyDay } from "./my-day";
import { DailyStandupCard } from "./daily-standup";
import { MyHours } from "./my-hours";
import { CheckpointSummaryCard } from "./weekly-checkpoint";
import type { TaskWithRelations } from "@/lib/queries/tasks";
import type { DailyStandup, TimeLogWithTask } from "@/lib/queries/dashboard-colaborador";

interface Props {
  tasks: TaskWithRelations[];
  concludedStatusId: string | null;
  standup: DailyStandup | null;
  weekMinutes: number;
  runningLog: TimeLogWithTask | null;
  recentLogs: TimeLogWithTask[];
}

export function ColaboradorDashboard({
  tasks,
  concludedStatusId,
  standup,
  weekMinutes,
  runningLog,
  recentLogs,
}: Props) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="grid w-full gap-px border border-border bg-border lg:grid-cols-2">
        <div className="w-full overflow-hidden bg-card px-4 py-1 md:px-6">
          <MyDay tasks={tasks} concludedStatusId={concludedStatusId} />
        </div>
        <div className="w-full overflow-hidden bg-card px-4 py-1 md:px-6">
          <CheckpointSummaryCard />
        </div>
      </div>

      <div className="w-full border border-border bg-card px-4 py-1 md:px-6">
        <DailyStandupCard standup={standup} />
      </div>

      <div className="w-full border border-border bg-card px-4 py-1 md:px-6">
        <MyHours
          weekMinutes={weekMinutes}
          runningLog={runningLog}
          recentLogs={recentLogs}
          myDayTasks={tasks}
        />
      </div>
    </div>
  );
}
