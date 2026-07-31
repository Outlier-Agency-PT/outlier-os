"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTemplateAsProcessAction } from "@/app/actions/processes";
import {
  UseTemplateTasksDialog,
  type ListOption,
} from "@/components/processes/use-template-tasks-dialog";
import type { Process } from "@/lib/queries/processes";
import type { TeamMember } from "@/lib/types";

interface Props {
  process: Process;
  lists: ListOption[];
  members: TeamMember[];
}

export function UseTemplateButton({ process, lists, members }: Props) {
  const [isPending, startTransition] = useTransition();
  const [tasksDialogOpen, setTasksDialogOpen] = useState(false);
  const router = useRouter();

  function handleUse() {
    if (process.template_target === "tarefas") {
      setTasksDialogOpen(true);
      return;
    }

    startTransition(async () => {
      if (process.template_target === "processo") {
        const result = await useTemplateAsProcessAction(process);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Processo criado como rascunho.");
        router.push(`/processos/${result.id}`);
        return;
      }

      // briefing — placeholder para 5C
      toast.info("Em breve disponível.");
    });
  }

  return (
    <>
      <Button onClick={handleUse} disabled={isPending} size="sm">
        <Copy className="mr-2 h-4 w-4" />
        {isPending ? "A criar..." : "Usar este template"}
      </Button>

      {process.template_target === "tarefas" && (
        <UseTemplateTasksDialog
          open={tasksDialogOpen}
          onOpenChange={setTasksDialogOpen}
          contentMd={process.content_md ?? ""}
          templateId={process.id}
          lists={lists}
          members={members}
        />
      )}
    </>
  );
}
