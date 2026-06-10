"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MentorshipForm } from "./mentorship-form";
import { MENTORSHIP_STATUS_LABELS, type MentorshipStatus } from "@/lib/types";
import type { MentorshipWithStats } from "@/lib/queries/mentorships";

interface Props {
  mentorships: MentorshipWithStats[];
}

const STATUS_ORDER: MentorshipStatus[] = ["ativa", "em_pausa", "concluida", "arquivada"];

const STATUS_VARIANT: Record<MentorshipStatus, "default" | "secondary" | "outline"> = {
  ativa: "default",
  em_pausa: "secondary",
  concluida: "outline",
  arquivada: "outline",
};

export function MentorshipsGrid({ mentorships }: Props) {
  const [open, setOpen] = useState(false);

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: mentorships.filter((m) => m.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <div className="flex items-center justify-between border-b px-8 py-4">
        <p className="text-sm text-muted-foreground">
          {mentorships.filter((m) => m.status === "ativa").length} ativa(s) ·{" "}
          {mentorships.length} total
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Nova Mentoria
        </Button>
      </div>

      <div className="space-y-6 p-8">
        {mentorships.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              Sem mentorias. Adiciona cursos, livros, comunidades — qualquer coisa que estejas a aprender.
            </CardContent>
          </Card>
        ) : (
          grouped.map(({ status, items }) => (
            <section key={status}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {MENTORSHIP_STATUS_LABELS[status]} <span className="text-xs">({items.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => <MentorshipCard key={m.id} mentorship={m} />)}
              </div>
            </section>
          ))
        )}
      </div>

      <MentorshipForm open={open} onOpenChange={setOpen} />
    </>
  );
}

function MentorshipCard({ mentorship }: { mentorship: MentorshipWithStats }) {
  const progress = mentorship.modules_count
    ? Math.round((mentorship.modules_consumed / mentorship.modules_count) * 100)
    : 0;
  const actionsProgress = mentorship.actions_total
    ? Math.round((mentorship.actions_implemented / mentorship.actions_total) * 100)
    : 0;

  return (
    <Link href={`/mentorias/${mentorship.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <span className="text-2xl">{mentorship.cover_emoji}</span>
              <div>
                <h3 className="font-semibold leading-tight">{mentorship.name}</h3>
                {mentorship.mentor && (
                  <p className="text-xs text-muted-foreground">{mentorship.mentor}</p>
                )}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[mentorship.status]} className="shrink-0 text-[10px]">
              {MENTORSHIP_STATUS_LABELS[mentorship.status]}
            </Badge>
          </div>

          {mentorship.platform && (
            <p className="text-xs text-muted-foreground">{mentorship.platform}</p>
          )}

          {mentorship.modules_count > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Módulos: {mentorship.modules_consumed}/{mentorship.modules_count}
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {mentorship.actions_total > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Ações: {mentorship.actions_implemented}/{mentorship.actions_total}
                </span>
                <span className="font-medium">{actionsProgress}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${actionsProgress}%` }}
                />
              </div>
            </div>
          )}

          {mentorship.url && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <ExternalLink className="size-3" />
              <span className="truncate">{mentorship.url}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
