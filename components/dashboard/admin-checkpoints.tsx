"use client";

import { useState } from "react";
import type { MemberCheckpointStatus } from "@/lib/queries/checkpoints";
import { toWeekStart } from "@/lib/utils/week";

interface Props {
  initialWeekStart: string;
  initialStatuses: MemberCheckpointStatus[];
}

function formatWeekLabel(weekStart: string): string {
  const monday = new Date(weekStart + "T12:00:00Z");
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", timeZone: "UTC" });
  return `${fmt(monday)} a ${fmt(friday)}`;
}

function getPreviousWeeks(count = 6): string[] {
  const weeks: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weeks.push(toWeekStart(d));
  }
  return weeks;
}

export function AdminCheckpoints({ initialWeekStart, initialStatuses }: Props) {
  const [selectedWeek, setSelectedWeek] = useState(initialWeekStart);
  const [statuses, setStatuses] = useState<MemberCheckpointStatus[]>(initialStatuses);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const weeks = getPreviousWeeks(6);
  const submittedCount = statuses.filter((s) => s.submitted).length;

  async function handleWeekChange(week: string) {
    setSelectedWeek(week);
    setExpandedId(null);
    setLoadingWeek(true);
    try {
      const res = await fetch(`/api/checkpoints/status?week=${week}`);
      if (res.ok) {
        const data = await res.json();
        setStatuses(data);
      }
    } finally {
      setLoadingWeek(false);
    }
  }

  return (
    <div>
      <div className="border-b border-border pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Checkpoints da Equipa
          </h2>
          <select
            value={selectedWeek}
            onChange={(e) => handleWeekChange(e.target.value)}
            className="rounded-[3px] border border-border bg-background px-2 py-0.5 text-[11px] text-foreground"
          >
            {weeks.map((w) => (
              <option key={w} value={w}>
                Semana de {formatWeekLabel(w)}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          Semana de {formatWeekLabel(selectedWeek)} · {submittedCount}/{statuses.length} submetidos
        </p>
      </div>

      {loadingWeek ? (
        <p className="py-6 text-sm font-light text-muted-foreground">A carregar...</p>
      ) : statuses.length === 0 ? (
        <p className="py-6 text-sm font-light text-muted-foreground">Sem membros activos.</p>
      ) : (
        <ul className="divide-y divide-border">
          {statuses.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => s.submitted && setExpandedId(expandedId === s.id ? null : s.id)}
                className={[
                  "flex w-full items-center gap-3 py-3 text-left",
                  s.submitted ? "cursor-pointer" : "cursor-default",
                ].join(" ")}
              >
                {s.submitted ? (
                  <span className="text-sm text-green-600">✅</span>
                ) : (
                  <span className="text-sm text-muted-foreground/40">○</span>
                )}
                <span className="flex-1 text-sm font-medium">{s.full_name}</span>
                {s.submitted && (
                  <span className="text-[11px] text-muted-foreground/50">
                    {expandedId === s.id ? "fechar ▲" : "ver ▼"}
                  </span>
                )}
              </button>

              {expandedId === s.id && s.checkpoint && (
                <div className="mb-3 ml-7 space-y-3 border-l border-border pl-4">
                  <CheckpointField label="✅ O que correu bem?" value={s.checkpoint.positive} />
                  <CheckpointField
                    label="🏆 O que concluí / entreguei?"
                    value={s.checkpoint.achievements}
                  />
                  <CheckpointField
                    label="🧱 O que foi difícil ou ficou por resolver?"
                    value={s.checkpoint.challenges}
                  />
                  <CheckpointField
                    label="🔁 O que faria diferente?"
                    value={s.checkpoint.improvements}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckpointField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm leading-snug">{value}</p>
    </div>
  );
}
