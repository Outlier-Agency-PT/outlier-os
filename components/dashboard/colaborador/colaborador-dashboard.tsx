"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MyDay } from "./my-day";
import { MyHours } from "./my-hours";
import { DashboardExtraBlocks } from "./dashboard-extra-blocks";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import { TaskForm } from "@/components/tasks/task-form";
import { fetchTaskFormDataAction } from "@/lib/actions/tasks";
import { fetchMyOpenTasksAction } from "@/lib/actions/tasks";
import type { SimpleTask } from "./my-hours";
import type { TaskWithRelations } from "@/lib/queries/tasks";
import type { ReactNode } from "react";
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
  checkpointCard: ReactNode;
  isAdmin?: boolean;
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
  checkpointCard,
  isAdmin = false,
}: Props) {
  const router = useRouter();

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskFormReady, setTaskFormReady] = useState(false);
  const [taskFormData, setTaskFormData] = useState<{
    statuses: { id: string; label: string }[];
    clients: { id: string; label: string }[];
    members: { id: string; label: string }[];
    lists: { id: string; name: string; spaceName?: string }[];
  }>({ statuses: [], clients: [], members: [], lists: [] });
  const [timerTaskList, setTimerTaskList] = useState<SimpleTask[]>(tasks);

  useEffect(() => {
    if (!taskFormOpen || taskFormReady) return;
    fetchTaskFormDataAction().then((data) => {
      setTaskFormData(data);
      setTaskFormReady(true);
    });
  }, [taskFormOpen]);

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
          {checkpointCard}
        </div>
      </div>

      <DashboardExtraBlocks
        notifications={notifications}
        unread_count={unread_count}
        overdue_tasks={overdue_tasks}
        incubadora={incubadora}
        renewals={renewals}
        hasIncubadora={hasIncubadora}
        isAdmin={isAdmin}
      />

      <div className="w-full border border-border bg-card px-4 py-1 md:px-6">
        <MyHours
          todayMinutes={todayMinutes}
          runningLog={runningLog}
          recentLogs={recentLogs}
          myDayTasks={timerTaskList}
          onNewTask={() => setTaskFormOpen(true)}
        />
      </div>

      {taskFormReady && (
        <TaskForm
          open={taskFormOpen}
          onOpenChange={(open) => {
            setTaskFormOpen(open);
            if (!open) {
              fetchMyOpenTasksAction().then((res) => setTimerTaskList(res.data));
              router.refresh();
            }
          }}
          statuses={taskFormData.statuses}
          clients={taskFormData.clients}
          members={taskFormData.members}
          lists={taskFormData.lists}
        />
      )}
    </div>
  );
}
