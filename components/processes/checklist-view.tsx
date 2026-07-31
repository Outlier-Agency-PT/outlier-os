"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toggleChecklistItem } from "@/app/actions/checklist";
import { cn } from "@/lib/utils";

interface Props {
  processId: string;
  items: string[];
  completedIndexes: number[];
}

export function ChecklistView({ processId, items, completedIndexes }: Props) {
  const [completed, setCompleted] = useState<Set<number>>(
    new Set(completedIndexes)
  );
  const [isPending, startTransition] = useTransition();

  function handleToggle(index: number) {
    const isCompleted = completed.has(index);
    const next = new Set(completed);
    isCompleted ? next.delete(index) : next.add(index);
    setCompleted(next);

    startTransition(async () => {
      await toggleChecklistItem(processId, index, !isCompleted);
    });
  }

  const total = items.length;
  const done = completed.size;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{done}/{total} itens concluídos</span>
        </div>
        <Progress value={percent} className="h-2" />
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-md p-2
              hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => handleToggle(index)}
          >
            <Checkbox
              checked={completed.has(index)}
              onCheckedChange={() => handleToggle(index)}
              className="mt-0.5"
              disabled={isPending}
            />
            <span
              className={cn(
                "text-sm leading-relaxed select-none",
                completed.has(index) &&
                  "line-through text-muted-foreground"
              )}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
