"use client";

import { useState, useTransition } from "react";
import { fetchRecentActivityAction } from "@/lib/actions/activity";
import { describeActivity, type Activity } from "@/lib/utils/activity-helpers";
import { formatRelative } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INITIAL_LIMIT = 5;

interface Member {
  id: string;
  full_name: string;
}

interface RecentActivityFeedProps {
  initialActivity: Activity[];
  members: Member[];
}

export function RecentActivityFeed({ initialActivity, members }: RecentActivityFeedProps) {
  const [activity, setActivity] = useState<Activity[]>(initialActivity);
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleMemberChange(value: string) {
    setSelectedMember(value);
    setShowAll(false);
    startTransition(async () => {
      const data = await fetchRecentActivityAction(value === "all" ? undefined : value);
      setActivity(data);
    });
  }

  const displayed = showAll ? activity : activity.slice(0, INITIAL_LIMIT);
  const remaining = activity.length - INITIAL_LIMIT;

  return (
    <div>
      <div className="border-b border-border pb-3 flex items-center justify-between gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Atividade Recente
        </h2>
        <Select value={selectedMember} onValueChange={handleMemberChange}>
          <SelectTrigger className="h-7 w-44 text-xs border-none shadow-none bg-transparent text-muted-foreground focus:ring-0 px-0 justify-end gap-1.5">
            <SelectValue placeholder="Toda a equipa" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">Toda a equipa</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activity.length === 0 ? (
        <p className="py-6 text-sm font-light text-muted-foreground">
          {selectedMember === "all"
            ? "Sem atividade ainda. Cria clientes, tarefas ou lançamentos para preencher o feed."
            : "Sem atividade registada para esta pessoa."}
        </p>
      ) : (
        <>
          <ul className={`divide-y divide-border transition-opacity ${isPending ? "opacity-40" : "opacity-100"}`}>
            {displayed.map((a) => (
              <li key={a.id} className="flex items-baseline justify-between gap-4 py-3">
                <p className="min-w-0 flex-1 text-sm leading-snug">
                  <span className="font-medium tracking-[-0.01em]">
                    {a.member?.full_name ?? "Sistema"}
                  </span>{" "}
                  <span className="font-light text-muted-foreground">
                    {describeActivity(a)}
                  </span>
                </p>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/45">
                  {formatRelative(a.created_at)}
                </span>
              </li>
            ))}
          </ul>

          {!showAll && remaining > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-2 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Ver todos ({activity.length})
            </button>
          )}
          {showAll && activity.length > INITIAL_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="mt-2 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Mostrar menos
            </button>
          )}
        </>
      )}
    </div>
  );
}
