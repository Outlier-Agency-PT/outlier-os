"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { saveDailyStandupAction } from "@/lib/actions/daily-standups";
import { toast } from "sonner";
import type { DailyStandup } from "@/lib/queries/dashboard-colaborador";

interface Props {
  standup: DailyStandup | null;
}

export function DailyStandupCard({ standup }: Props) {
  const [editing, setEditing] = useState(!standup);

  return (
    <div>
      <div className="border-b border-border pb-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Daily Standup
        </h2>
      </div>
      <div className="py-4">
        {editing ? (
          <StandupForm standup={standup} onSaved={() => setEditing(false)} />
        ) : standup ? (
          <StandupReadOnly standup={standup} onEdit={() => setEditing(true)} />
        ) : null}
      </div>
    </div>
  );
}

function StandupReadOnly({ standup, onEdit }: { standup: DailyStandup; onEdit: () => void }) {
  return (
    <div className="space-y-4">
      <Field label="O que fiz ontem?" value={standup.yesterday} />
      <Field label="O que vou fazer hoje?" value={standup.today} />
      <Field label="Há algum bloqueador?" value={standup.blockers} />
      <Button size="sm" variant="outline" onClick={onEdit}>
        Editar
      </Button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-snug">{value || "—"}</p>
    </div>
  );
}

function StandupForm({ standup, onSaved }: { standup: DailyStandup | null; onSaved: () => void }) {
  const router = useRouter();
  const [yesterday, setYesterday] = useState(standup?.yesterday ?? "");
  const [today, setToday] = useState(standup?.today ?? "");
  const [blockers, setBlockers] = useState(standup?.blockers ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    const result = await saveDailyStandupAction({ yesterday, today, blockers });
    setLoading(false);

    if ("error" in result && result.error) {
      toast.error("Erro ao guardar standup");
      return;
    }
    toast.success("Standup guardado");
    router.refresh();
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="standup-yesterday" className="text-xs font-semibold">
          O que fiz ontem?
        </Label>
        <Textarea
          id="standup-yesterday"
          value={yesterday}
          onChange={(e) => setYesterday(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="standup-today" className="text-xs font-semibold">
          O que vou fazer hoje?
        </Label>
        <Textarea
          id="standup-today"
          value={today}
          onChange={(e) => setToday(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="standup-blockers" className="text-xs font-semibold">
          Há algum bloqueador?
        </Label>
        <Textarea
          id="standup-blockers"
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </div>
      <Button size="sm" onClick={handleSave} disabled={loading}>
        {loading ? "A guardar..." : "Guardar"}
      </Button>
    </div>
  );
}
