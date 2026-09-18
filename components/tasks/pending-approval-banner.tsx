"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PendingApprovalModal } from "./pending-approval-modal";
import type { TaskWithRelations } from "@/lib/queries/tasks";

interface PendingApprovalBannerProps {
  tasks: TaskWithRelations[];
  members: { id: string; label: string }[];
  autoOpen: boolean;
}

export function PendingApprovalBanner({
  tasks,
  members,
  autoOpen,
}: PendingApprovalBannerProps) {
  const [open, setOpen] = useState(autoOpen);

  if (tasks.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <Bell className="h-4 w-4 shrink-0" />
          <span>
            {tasks.length === 1
              ? "1 tarefa da reunião aguarda a tua aprovação"
              : `${tasks.length} tarefas da reunião aguardam a tua aprovação`}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
          onClick={() => setOpen(true)}
        >
          Ver tarefas
        </Button>
      </div>
      <PendingApprovalModal
        tasks={tasks}
        members={members}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
