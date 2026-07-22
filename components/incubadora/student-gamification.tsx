"use client";

import { useState, useEffect } from "react";
import { getStudentJourneyMilestonesAction } from "@/lib/actions/milestones";
import type { JourneyMilestone } from "@/lib/queries/milestones";

export function StudentGamification() {
  const [milestones, setMilestones] = useState<JourneyMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudentJourneyMilestonesAction().then((journey) => {
      setMilestones(journey);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="mb-4 font-semibold">A Minha Jornada</h3>

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Os teus marcos de negócio aparecerão aqui à medida que avanças.
        </p>
      ) : (
        <div>
          {milestones.map((m, idx) => (
            <div key={m.key} className="flex gap-3">
              {/* Ícone + linha vertical */}
              <div className="flex flex-col items-center">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: "#A12B2B", backgroundColor: "rgba(161,43,43,0.08)" }}
                >
                  <span className="text-sm leading-none">{m.icon}</span>
                </div>
                {idx < milestones.length - 1 && (
                  <div className="my-1 w-px flex-1 bg-border" style={{ minHeight: 20 }} />
                )}
              </div>
              {/* Texto */}
              <div className="pb-5 pt-1">
                <p className="text-sm font-medium leading-tight">{m.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(m.achieved_at).toLocaleDateString("pt-PT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
