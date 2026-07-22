"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionStatusBadge } from "@/components/ui/section-status-badge";
import { toast } from "sonner";
import {
  getStudentAudienceProfilesAction,
  updateAudienceProfileAction,
  updateAudienceReviewStatusAction,
} from "@/lib/actions/audience";
import type { AudienceProfile, PersonaMarca, ConteudoConsumido } from "@/lib/queries/audience";
import type { ReviewStatus } from "@/lib/types/review-status";
import { COACH_TRANSITIONS } from "@/lib/types/review-status";

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((v, i) => (
        <span
          key={i}
          className="inline-flex rounded-full border bg-muted px-2.5 py-0.5 text-xs"
        >
          {v}
        </span>
      ))}
    </div>
  );
}

// ── Profile expanded view ─────────────────────────────────────────────────────

function ProfileDetail({ profile }: { profile: AudienceProfile }) {
  const p = profile;
  return (
    <div className="space-y-6 text-sm">
      {/* Identificação */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Identificação
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow label="Faixa etária" value={p.faixa_etaria} />
          <FieldRow label="Género" value={p.genero} />
          <FieldRow label="Estatuto social" value={p.estatuto_social} />
          <FieldRow label="Rendimento" value={p.rendimento} />
          <FieldRow label="Núcleo familiar" value={p.nucleo_familiar} />
          <FieldRow label="Área profissional" value={p.area_profissional} />
          <FieldRow label="Habilitações" value={p.habilitacoes} />
        </div>
      </section>

      {/* Situação Actual */}
      {(p.problemas.length > 0 || p.dores.length > 0 || p.medos.length > 0 ||
        p.frustracoes.length > 0 || p.desafios.length > 0 ||
        p.tentativas_anteriores.length > 0 || p.porque_nao_resolveu) && (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Situação Actual
          </p>
          <div className="space-y-3">
            <FieldRow label="Problemas" value={<TagList items={p.problemas} />} />
            <FieldRow label="Dores" value={<TagList items={p.dores} />} />
            <FieldRow label="Medos" value={<TagList items={p.medos} />} />
            <FieldRow label="Frustrações" value={<TagList items={p.frustracoes} />} />
            <FieldRow label="Desafios" value={<TagList items={p.desafios} />} />
            <FieldRow label="Tentativas anteriores" value={<TagList items={p.tentativas_anteriores} />} />
            <FieldRow label="Porque não resolveu" value={p.porque_nao_resolveu} />
          </div>
        </section>
      )}

      {/* Situação Desejada */}
      {(p.transformacoes.length > 0 || p.beneficios.length > 0 || p.sonhos_objetivos.length > 0 ||
        p.como_quer_sentir || p.definicao_sucesso) && (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Situação Desejada
          </p>
          <div className="space-y-3">
            <FieldRow label="Transformações" value={<TagList items={p.transformacoes} />} />
            <FieldRow label="Benefícios" value={<TagList items={p.beneficios} />} />
            <FieldRow label="Sonhos e objectivos" value={<TagList items={p.sonhos_objetivos} />} />
            <FieldRow label="Como quer sentir-se" value={p.como_quer_sentir} />
            <FieldRow label="Definição de sucesso" value={p.definicao_sucesso} />
          </div>
        </section>
      )}

      {/* Comportamento */}
      {(p.redes_sociais.length > 0 || p.pessoas_marcas_seguidas.length > 0 ||
        p.conteudos_consumidos.length > 0 || p.linguagem.length > 0 ||
        p.fatores_decisao.length > 0 || p.barreiras.length > 0) && (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Comportamento
          </p>
          <div className="space-y-3">
            <FieldRow label="Redes sociais" value={<TagList items={p.redes_sociais} />} />
            {p.pessoas_marcas_seguidas.length > 0 && (
              <FieldRow
                label="Pessoas e marcas seguidas"
                value={
                  <div className="space-y-1">
                    {(p.pessoas_marcas_seguidas as PersonaMarca[]).map((v, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium">{v.nome}</span>
                        {v.motivo && <span className="ml-1 text-muted-foreground">— {v.motivo}</span>}
                      </div>
                    ))}
                  </div>
                }
              />
            )}
            {p.conteudos_consumidos.length > 0 && (
              <FieldRow
                label="Conteúdos consumidos"
                value={
                  <div className="flex flex-wrap gap-1.5">
                    {(p.conteudos_consumidos as ConteudoConsumido[]).map((v, i) => (
                      <span key={i} className="inline-flex rounded-full border bg-muted px-2.5 py-0.5 text-xs">
                        {v.formato}{v.tema ? ` · ${v.tema}` : ""}
                      </span>
                    ))}
                  </div>
                }
              />
            )}
            <FieldRow label="Linguagem" value={<TagList items={p.linguagem} />} />
            <FieldRow label="Factores de decisão" value={<TagList items={p.fatores_decisao} />} />
            <FieldRow label="Barreiras à compra" value={<TagList items={p.barreiras} />} />
          </div>
        </section>
      )}
    </div>
  );
}

// ── Profile row (expandable) ──────────────────────────────────────────────────

function ProfileRow({ profile, onReviewUpdate }: {
  profile: AudienceProfile;
  onReviewUpdate: (id: string, status: ReviewStatus, notes?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(
    profile.review_status as ReviewStatus,
  );
  const [reviewNotes, setReviewNotes] = useState(profile.review_notes ?? "");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [notesInput, setNotesInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesEditInput, setNotesEditInput] = useState("");

  const transitions = COACH_TRANSITIONS[reviewStatus] ?? [];

  async function handleTransition(next: ReviewStatus, notes?: string) {
    setLoading(true);
    const result = await updateAudienceReviewStatusAction(profile.id, next, notes);
    setLoading(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    setReviewStatus(next);
    if (notes) setReviewNotes(notes);
    setShowNotesInput(false);
    setNotesInput("");
    onReviewUpdate(profile.id, next, notes);
    toast.success(
      next === "aprovado"
        ? "Perfil aprovado"
        : next === "alteracoes_pedidas"
          ? "Alterações pedidas ao aluno"
          : "Estado actualizado",
    );
  }

  async function handleSaveNotes() {
    setLoading(true);
    const result = await updateAudienceReviewStatusAction(profile.id, reviewStatus, notesEditInput);
    setLoading(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    setReviewNotes(notesEditInput);
    setEditingNotes(false);
    toast.success("Nota guardada");
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Row header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex flex-1 items-center gap-2 min-w-0 flex-wrap">
          <span className="text-sm font-medium truncate">{profile.name}</span>
          {profile.is_primary && (
            <Star className="size-3 text-amber-500 shrink-0" />
          )}
          <SectionStatusBadge status={reviewStatus} />
        </div>
        {profile.faixa_etaria && (
          <span className="shrink-0 text-xs text-muted-foreground hidden sm:block">
            {profile.faixa_etaria}
          </span>
        )}
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t p-4 space-y-4">
          <ProfileDetail profile={profile} />

          {/* Nota de revisão */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Nota de revisão</p>
              {!editingNotes && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    setNotesEditInput(reviewNotes);
                    setEditingNotes(true);
                  }}
                >
                  <span className="text-xs">✎</span>
                </Button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesEditInput}
                  onChange={(e) => setNotesEditInput(e.target.value)}
                  rows={3}
                  className="text-sm"
                  autoFocus
                  placeholder="Feedback para o aluno..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNotes} disabled={loading}>
                    {loading ? "A guardar..." : "Guardar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {reviewNotes || "—"}
              </p>
            )}
          </div>

          {/* Transições */}
          {transitions.length > 0 && (
            <div className="rounded-lg border border-dashed p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Mudar estado</p>
              <div className="flex flex-wrap gap-2">
                {transitions.includes("aprovado") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => handleTransition("aprovado")}
                    disabled={loading}
                  >
                    Aprovar
                  </Button>
                )}
                {transitions.includes("alteracoes_pedidas") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() => setShowNotesInput((p) => !p)}
                    disabled={loading}
                  >
                    Pedir alterações
                  </Button>
                )}
                {transitions.includes("arquivado") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => handleTransition("arquivado")}
                    disabled={loading}
                  >
                    Arquivar
                  </Button>
                )}
              </div>

              {showNotesInput && (
                <div className="space-y-2">
                  <Textarea
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Descreve as alterações necessárias (obrigatório)…"
                    rows={3}
                    className="text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleTransition("alteracoes_pedidas", notesInput)}
                      disabled={loading || !notesInput.trim()}
                    >
                      {loading ? "A enviar..." : "Enviar feedback"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowNotesInput(false); setNotesInput(""); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StudentAudienceCoach({ studentId }: { studentId: string }) {
  const [profiles, setProfiles] = useState<AudienceProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudentAudienceProfilesAction(studentId)
      .then(setProfiles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  function handleReviewUpdate(id: string, status: ReviewStatus) {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, review_status: status } : p)),
    );
  }

  const active = profiles.filter((p) => !p.is_archived);
  const archived = profiles.filter((p) => p.is_archived);

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          O aluno ainda não criou nenhum perfil de audiência.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {active.map((p) => (
              <ProfileRow
                key={p.id}
                profile={p}
                onReviewUpdate={handleReviewUpdate}
              />
            ))}
          </div>
          {archived.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                {archived.length} arquivado{archived.length !== 1 ? "s" : ""}
              </summary>
              <div className="mt-2 space-y-2 opacity-60">
                {archived.map((p) => (
                  <ProfileRow
                    key={p.id}
                    profile={p}
                    onReviewUpdate={handleReviewUpdate}
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
