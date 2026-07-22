"use client";

import { useState } from "react";
import { addDays, format } from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckpointCard } from "./checkpoint-card";
import type { Department } from "./checkpoint-card";
import {
  getWeeklyCheckpoints,
  getAutoMetrics,
  getOrCreateCheckpoint,
  updateCheckpointMetrics,
  submitCheckpoint,
} from "@/lib/actions/checkpoints";

const DEPARTMENTS: Department[] = ["trafego", "incubadora", "vendas", "desenvolvimento"];

type CheckpointRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  notes: string | null;
  metrics: Record<string, unknown>;
  department: string;
} | null;

interface Props {
  initialCheckpoints: CheckpointRow[];
  initialAutoMetrics: {
    incubadora: Record<string, number>;
    desenvolvimento: Record<string, number>;
  };
  userDepartments: string[];
  isAdmin: boolean;
  initialWeekStart: string;
}

export function CheckpointPageClient({
  initialCheckpoints,
  initialAutoMetrics,
  userDepartments,
  isAdmin,
  initialWeekStart,
}: Props) {
  const [weekStart, setWeekStart] = useState(
    () => new Date(initialWeekStart + "T00:00:00Z"),
  );
  const [checkpoints, setCheckpoints] = useState<CheckpointRow[]>(initialCheckpoints);
  const [autoMetrics, setAutoMetrics] = useState(initialAutoMetrics);
  const [navigating, setNavigating] = useState(false);

  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekLabel = `Semana de ${format(weekStart, "d 'de' MMMM", { locale: pt })} a ${format(addDays(weekStart, 4), "d 'de' MMMM 'de' yyyy", { locale: pt })}`;

  async function navigate(direction: -1 | 1) {
    setNavigating(true);
    const next = addDays(weekStart, direction * 7);
    const nextEnd = addDays(next, 7);
    const [newCheckpoints, incMetrics, devMetrics] = await Promise.all([
      getWeeklyCheckpoints(next),
      getAutoMetrics("incubadora", next, nextEnd),
      getAutoMetrics("desenvolvimento", next, nextEnd),
    ]);
    setWeekStart(next);
    setCheckpoints(newCheckpoints as CheckpointRow[]);
    setAutoMetrics({ incubadora: incMetrics, desenvolvimento: devMetrics });
    setNavigating(false);
  }

  async function refreshCheckpoints() {
    const updated = await getWeeklyCheckpoints(weekStart);
    setCheckpoints(updated as CheckpointRow[]);
  }

  async function handleSave(
    department: Department,
    index: number,
    metrics: Record<string, number | string>,
    notes?: string,
  ) {
    let cp = checkpoints[index];
    if (!cp) {
      cp = (await getOrCreateCheckpoint(department, weekStart)) as CheckpointRow;
    }
    if (!cp) return;
    await updateCheckpointMetrics(cp.id, metrics, notes);
    await refreshCheckpoints();
  }

  async function handleSubmit(department: Department, index: number) {
    let cp = checkpoints[index];
    if (!cp) {
      cp = (await getOrCreateCheckpoint(department, weekStart)) as CheckpointRow;
    }
    if (!cp) return;
    await submitCheckpoint(cp.id);
    await refreshCheckpoints();
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Cabeçalho com navegação */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] text-muted-foreground">{weekLabel}</p>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => navigate(-1)}
            disabled={navigating}
            aria-label="Semana anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => navigate(1)}
            disabled={navigating}
            aria-label="Semana seguinte"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEPARTMENTS.map((dept, i) => {
          const deptAutoMetrics =
            dept === "incubadora"
              ? autoMetrics.incubadora
              : dept === "desenvolvimento"
                ? autoMetrics.desenvolvimento
                : {};

          return (
            <CheckpointCard
              key={dept + "-" + weekStartStr}
              department={dept}
              checkpoint={checkpoints[i] ?? null}
              autoMetrics={deptAutoMetrics}
              canEdit={isAdmin || userDepartments.includes(dept)}
              onSave={(metrics, notes) => handleSave(dept, i, metrics, notes)}
              onSubmit={() => handleSubmit(dept, i)}
            />
          );
        })}
      </div>
    </div>
  );
}
