"use client";

import { useState, useTransition } from "react";
import { Star, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateInitiativeAction } from "@/lib/actions/initiatives";
import { toast } from "sonner";

interface Props {
  id: string;
  focusThisWeek: boolean;
  needsDecision: boolean;
  size?: "sm" | "md";
}

export function InitiativeToggles({
  id,
  focusThisWeek: initialFocus,
  needsDecision: initialNeeds,
  size = "sm",
}: Props) {
  const [focus, setFocus] = useState(initialFocus);
  const [needs, setNeeds] = useState(initialNeeds);
  const [pending, startTransition] = useTransition();

  const iconSize = size === "sm" ? "size-4" : "size-5";

  function toggleFocus(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !focus;
    setFocus(next);
    startTransition(async () => {
      const r = await updateInitiativeAction(id, { focus_this_week: next });
      if ("error" in r && r.error) {
        setFocus(focus);
        toast.error("Falhou");
      } else {
        toast.success(next ? "No foco da semana" : "Removido do foco");
      }
    });
  }
  function toggleNeeds(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !needs;
    setNeeds(next);
    startTransition(async () => {
      const r = await updateInitiativeAction(id, { needs_decision: next });
      if ("error" in r && r.error) {
        setNeeds(needs);
        toast.error("Falhou");
      } else {
        toast.success(next ? "Marcada como precisa decisão" : "Decisão resolvida");
      }
    });
  }

  return (
    <div className="flex items-center gap-1" aria-busy={pending}>
      <button
        type="button"
        onClick={toggleFocus}
        title={focus ? "Tirar do Foco da Semana" : "Marcar Foco da Semana"}
        className={cn(
          "rounded p-1 transition hover:bg-accent",
          pending && "opacity-50",
        )}
      >
        <Star
          className={cn(
            iconSize,
            focus ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
          )}
        />
      </button>
      <button
        type="button"
        onClick={toggleNeeds}
        title={needs ? "Marcar como decidida" : "Marcar precisa decisão"}
        className={cn(
          "rounded p-1 transition hover:bg-accent",
          pending && "opacity-50",
        )}
      >
        <AlertCircle
          className={cn(
            iconSize,
            needs ? "fill-red-500/20 text-red-500" : "text-muted-foreground",
          )}
        />
      </button>
    </div>
  );
}
