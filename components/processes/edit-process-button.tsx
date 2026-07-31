"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProcessDialog } from "@/components/processes/processes-view";
import type { Process, ProcessCategory } from "@/lib/queries/processes";
import type { TeamMember } from "@/lib/types";

interface Props {
  process: Process;
  categories: ProcessCategory[];
  members: TeamMember[];
}

export function EditProcessButton({ process, categories, members }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        Editar
      </Button>

      <CreateProcessDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        members={members}
        initialData={process}
        processId={process.id}
        onSuccess={() => setOpen(false)}
      />
    </>
  );
}
