"use client";

import { useState, useTransition } from "react";
import { TasksCalendar } from "@/components/tasks/tasks-calendar";
import { TaskSidebar } from "@/components/tasks/task-sidebar";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { getTaskDetailAction } from "@/lib/actions/tasks";
import { toast } from "sonner";
import type { TaskWithRelations, TaskSpace } from "@/lib/queries/tasks";
import type { Status, TeamMember } from "@/lib/types";

interface GlobalCalendarViewProps {
  tasks: TaskWithRelations[];
  spaces: TaskSpace[];
  statuses: Status[];
  members: Pick<TeamMember, "id" | "full_name">[];
}

export function GlobalCalendarView({
  tasks,
  spaces,
  statuses,
  members,
}: GlobalCalendarViewProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskData, setTaskData] = useState<{
    task: TaskWithRelations | null;
    comments: any[];
  }>({ task: null, comments: [] });
  const [, startTransition] = useTransition();

  function handleTaskClick(taskId: string) {
    setSelectedTaskId(taskId);
    startTransition(async () => {
      try {
        const result = await getTaskDetailAction(taskId);
        setTaskData({
          task: result.task as TaskWithRelations | null,
          comments: result.comments,
        });
      } catch {
        toast.error("Erro ao carregar tarefa");
      }
    });
  }

  function handleClose() {
    setSelectedTaskId(null);
    setTaskData({ task: null, comments: [] });
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height))]">
      <TaskSidebar spaces={spaces} />

      <div className="flex-1 overflow-hidden">
        <TasksCalendar
          tasks={tasks}
          onTaskClick={handleTaskClick}
          externalEvents={[]}
        />
      </div>

      {selectedTaskId && (
        <TaskDetailPanel
          task={taskData.task}
          comments={taskData.comments}
          statuses={statuses.map((s) => ({
            id: s.id,
            key: s.key,
            label: s.label,
            color: s.color,
          }))}
          lists={spaces.flatMap((s) => s.lists.map((l) => ({ ...l, spaceName: s.name })))}
          members={members}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
