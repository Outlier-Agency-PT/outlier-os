"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createOrUpdateCheckpointAction } from "@/lib/actions/checkpoints";
import { toast } from "sonner";
import type { WeeklyCheckpoint } from "@/lib/queries/checkpoints";

interface Props {
  checkpoint: WeeklyCheckpoint | null;
  weekLabel: string;
}

export function WeeklyCheckpointCard({ checkpoint, weekLabel }: Props) {
  const [editing, setEditing] = useState(!checkpoint);

  return (
    <div>
      <div className="border-b border-border pb-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Checkpoint Semanal
          </h2>
          <span className="text-[11px] text-muted-foreground/60">{weekLabel}</span>
        </div>
      </div>
      <div className="py-4">
        {editing ? (
          <CheckpointForm
            checkpoint={checkpoint}
            onSaved={() => setEditing(false)}
          />
        ) : checkpoint ? (
          <CheckpointReadOnly checkpoint={checkpoint} onEdit={() => setEditing(true)} />
        ) : null}
      </div>
    </div>
  );
}

function CheckpointReadOnly({
  checkpoint,
  onEdit,
}: {
  checkpoint: WeeklyCheckpoint;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="✅ O que correu bem?" value={checkpoint.positive} />
      <Field label="🏆 O que concluí / entreguei?" value={checkpoint.achievements} />
      <Field label="🧱 O que foi difícil ou ficou por resolver?" value={checkpoint.challenges} />
      <Field label="🔁 O que faria diferente na próxima semana?" value={checkpoint.improvements} />
      <Button size="sm" variant="outline" onClick={onEdit}>
        Editar
      </Button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-snug">{value || "—"}</p>
    </div>
  );
}

function CheckpointForm({
  checkpoint,
  onSaved,
}: {
  checkpoint: WeeklyCheckpoint | null;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [positive, setPositive] = useState(checkpoint?.positive ?? "");
  const [achievements, setAchievements] = useState(checkpoint?.achievements ?? "");
  const [challenges, setChallenges] = useState(checkpoint?.challenges ?? "");
  const [improvements, setImprovements] = useState(checkpoint?.improvements ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!positive.trim() || !achievements.trim() || !challenges.trim() || !improvements.trim()) {
      toast.error("Preenche todos os campos antes de submeter");
      return;
    }
    setLoading(true);
    const result = await createOrUpdateCheckpointAction({
      positive,
      achievements,
      challenges,
      improvements,
    });
    setLoading(false);

    if ("error" in result && result.error) {
      toast.error("Erro ao guardar checkpoint");
      return;
    }
    toast.success("Checkpoint guardado");
    router.refresh();
    onSaved();
  }

  return (
    <div className="space-y-4">
      <TextareaField
        id="cp-positive"
        label="✅ O que correu bem esta semana?"
        value={positive}
        onChange={setPositive}
      />
      <TextareaField
        id="cp-achievements"
        label="🏆 O que concluí / entreguei?"
        value={achievements}
        onChange={setAchievements}
      />
      <TextareaField
        id="cp-challenges"
        label="🧱 O que foi difícil ou ficou por resolver?"
        value={challenges}
        onChange={setChallenges}
      />
      <TextareaField
        id="cp-improvements"
        label="🔁 O que faria diferente na próxima semana?"
        value={improvements}
        onChange={setImprovements}
      />
      <Button size="sm" onClick={handleSave} disabled={loading}>
        {loading ? "A guardar..." : "Submeter Checkpoint"}
      </Button>
    </div>
  );
}

function TextareaField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold">
        {label}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="text-sm"
      />
    </div>
  );
}
