import { MyDay } from "./my-day";
import { MyHours } from "./my-hours";
import { CheckpointSummaryCard } from "./weekly-checkpoint";
import { DashboardExtraBlocks } from "./dashboard-extra-blocks";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import type { TaskWithRelations } from "@/lib/queries/tasks";
import type {
  TimeLogWithTask,
  DashNotification,
  DashOverdueTask,
  DashIncubadoraSummary,
  DashRenewal,
} from "@/lib/queries/dashboard-colaborador";

interface Props {
  tasks: TaskWithRelations[];
  concludedStatusId: string | null;
  memberId: string;
  todayMinutes: number;
  runningLog: TimeLogWithTask | null;
  recentLogs: TimeLogWithTask[];
  notifications: DashNotification[];
  unread_count: number;
  overdue_tasks: DashOverdueTask[];
  incubadora: DashIncubadoraSummary | null;
  renewals: DashRenewal[];
  hasIncubadora: boolean;
}

export function ColaboradorDashboard({
  tasks,
  concludedStatusId,
  memberId,
  todayMinutes,
  runningLog,
  recentLogs,
  notifications,
  unread_count,
  overdue_tasks,
  incubadora,
  renewals,
  hasIncubadora,
}: Props) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="w-full border border-border bg-card">
        <TodayTasks memberId={memberId} />
      </div>

      <div className="grid w-full gap-px border border-border bg-border lg:grid-cols-2">
        <div className="w-full overflow-hidden bg-card px-4 py-1 md:px-6">
          <MyDay tasks={tasks} concludedStatusId={concludedStatusId} />
        </div>
        <div className="w-full overflow-hidden bg-card px-4 py-1 md:px-6">
          <CheckpointSummaryCard />
        </div>
      </div>

      <DashboardExtraBlocks
        notifications={notifications}
        unread_count={unread_count}
        overdue_tasks={overdue_tasks}
        incubadora={incubadora}
        renewals={renewals}
        hasIncubadora={hasIncubadora}
      />

      <div className="w-full border border-border bg-card px-4 py-1 md:px-6">
        <MyHours
          todayMinutes={todayMinutes}
          runningLog={runningLog}
          recentLogs={recentLogs}
          myDayTasks={tasks}
        />
      </div>
    </div>
  );
}
