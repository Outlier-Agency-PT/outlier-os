"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Plus, X, AlertCircle, Send, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getStudentBriefingAction,
  saveStudentBriefingAction,
  submitBriefingForReviewAction,
} from "@/lib/actions/students";
import { SectionStatusBadge } from "@/components/ui/section-status-badge";
import { useAutosave } from "@/lib/hooks/use-autosave";
import type { ReviewStatus } from "@/lib/types/review-status";
import { ALUNO_TRANSITIONS } from "@/lib/types/review-status";
import type {
  StudentBriefing,
  BriefingNegocio,
  BriefingObjecao,
} from "@/lib/queries/students";

// ── Constants ────────────────────────────────────────────────────────────────

const NICHOS = [
  "Marketing Digital",
  "Desenvolvimento Pessoal",
  "Saúde e Bem-estar",
  "Finanças e Investimentos",
  "Educação e Cursos",
  "Tecnologia",
  "Negócios e Empreendedorismo",
  "Lifestyle",
  "Outro",
];



const PRIORIDADE_OPTIONS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function emptyNegocio(): BriefingNegocio {
  return {
    objetivos: [],
    valores: [],
    dores_resolvidas: [],
    concorrentes: [],
    referencias: [],
    swot: { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] },
  };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function TagInput({
  tags,
  onChange,
  placeholder,
  disabled,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");

  function add() {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  }

  return (
    <div className="space-y-2">
      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={placeholder ?? "Adicionar e pressionar Enter..."}
            className="text-sm"
          />
          <Button type="button" size="sm" variant="outline" onClick={add}>
            <Plus className="size-3" />
          </Button>
        </div>
      )}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(tags.filter((_, j) => j !== i))}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-2.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      ) : disabled ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : null}
    </div>
  );
}


function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export interface BriefingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
  isReadOnly?: boolean;
  initialData?: StudentBriefing | null;
  onGoToAudience?: () => void;
  onGoToProducts?: () => void;
}

export function BriefingDialog({
  open,
  onOpenChange,
  studentId,
  isReadOnly = false,
  initialData,
  onGoToAudience,
  onGoToProducts,
}: BriefingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [submittingReview, setSubmittingReview] = useState(false);

  // Review status (negócio tab)
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("nao_iniciado");
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);

  // Step state
  const [negocio, setNegocio] = useState<BriefingNegocio>(emptyNegocio());
  const [objecoes, setObjecoes] = useState<BriefingObjecao[]>([]);

  // Nicho "Outro" handling
  const [nichoOutroInput, setNichoOutroInput] = useState("");
  const NICHO_OPTS_FIXED = NICHOS.slice(0, -1);
  const nichoSelectValue = NICHO_OPTS_FIXED.includes(negocio.nicho ?? "")
    ? negocio.nicho
    : negocio.nicho
      ? "Outro"
      : "";

  // Autosave para a tab Negócio — só activo quando não é read-only
  const hasLoadedRef = useRef(false);
  const autosaveNegocio = useAutosave(
    async (data: BriefingNegocio) => {
      await saveStudentBriefingAction("negocio", data as Record<string, unknown>, studentId);
    },
    1500,
  );

  function setNegocioAndSave(next: BriefingNegocio) {
    setNegocio(next);
    if (!isReadOnly && hasLoadedRef.current) {
      autosaveNegocio(next);
    }
  }

  function populate(data: StudentBriefing) {
    setNegocio({ ...emptyNegocio(), ...(data.negocio ?? {}) });
    setReviewStatus(data.review_status ?? "nao_iniciado");
    setReviewNotes(data.review_notes ?? null);
    setObjecoes(data.objecoes ?? []);

    const n = data.negocio?.nicho ?? "";
    if (n && !NICHO_OPTS_FIXED.includes(n)) setNichoOutroInput(n);

    hasLoadedRef.current = true;
  }

  useEffect(() => {
    if (!open) {
      hasLoadedRef.current = false;
      return;
    }
    if (initialData) {
      populate(initialData);
      return;
    }
    setIsLoading(true);
    getStudentBriefingAction(studentId).then((data) => {
      if (data) populate(data as StudentBriefing);
      setIsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Completion per step (for ✓ badge)
  const negocioComplete = !!(
    negocio.nome_negocio &&
    negocio.nicho &&
    negocio.publico_alvo &&
    negocio.proposta_valor &&
    negocio.transformacao_entregue
  );
  const objecoesComplete =
    objecoes.length > 0 &&
    objecoes.every((o) => o.objecao.trim() !== "" && o.resposta.trim() !== "");
  const stepComplete = {
    negocio: negocioComplete,
    objecoes: objecoesComplete,
  };
  const completedCount = Object.values(stepComplete).filter(Boolean).length;

  // Se o aluno pode submeter para revisão (baseado nas ALUNO_TRANSITIONS)
  const canSubmitReview =
    !isReadOnly &&
    negocio.nome_negocio &&
    !!(ALUNO_TRANSITIONS[reviewStatus]?.includes("pronto_revisao"));

  async function save(step: string, data: Record<string, unknown>) {
    setSaving((p) => ({ ...p, [step]: true }));
    const result = await saveStudentBriefingAction(
      step as any,
      data,
      studentId,
    );
    setSaving((p) => ({ ...p, [step]: false }));
    if (result && "error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Guardado");
    }
  }

  async function handleSubmitForReview() {
    setSubmittingReview(true);
    // Garante que a versão mais recente está guardada antes de submeter
    await saveStudentBriefingAction("negocio", negocio as Record<string, unknown>, studentId);
    const result = await submitBriefingForReviewAction(studentId);
    setSubmittingReview(false);
    if (result && "error" in result) {
      toast.error(result.error);
    } else {
      setReviewStatus("pronto_revisao");
      toast.success("Módulo Negócio enviado para revisão do coach");
    }
  }

  function SaveButton({
    step,
    data,
    disabled: extraDisabled,
  }: {
    step: string;
    data: Record<string, unknown>;
    disabled?: boolean;
  }) {
    if (isReadOnly) return null;
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => save(step, data)}
        disabled={saving[step] || !!extraDisabled}
      >
        {saving[step] ? "A guardar..." : "Guardar"}
      </Button>
    );
  }

  function TabLabel({ label, complete }: { label: string; complete: boolean }) {
    return (
      <span className="flex items-center gap-1">
        {label}
        {complete && <Check className="size-3 text-green-600" />}
      </span>
    );
  }

  // ── SWOT helpers ──────────────────────────────────────────────────────────

  function setSwotField(
    field: "forcas" | "fraquezas" | "oportunidades" | "ameacas",
    value: string[],
  ) {
    setNegocioAndSave({
      ...negocio,
      swot: {
        forcas: [],
        fraquezas: [],
        oportunidades: [],
        ameacas: [],
        ...(negocio.swot ?? {}),
        [field]: value,
      },
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>Briefing do Negócio</DialogTitle>
            <div className="flex items-center gap-2">
              <SectionStatusBadge status={reviewStatus} />
              <Badge variant="outline" className="rounded-full text-xs font-normal">
                {completedCount}/2 completos
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
            A carregar...
          </div>
        ) : (
          <>
          {!isReadOnly && (onGoToAudience || onGoToProducts) && (
            <div className="mx-6 mt-4 space-y-2">
              {onGoToAudience && (
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    O perfil de audiência agora é definido na secção Perfis de Audiência da tua área.
                  </p>
                  <button
                    type="button"
                    onClick={onGoToAudience}
                    className="shrink-0 text-xs font-medium underline underline-offset-2 hover:text-foreground"
                  >
                    Ir para Perfis de Audiência
                  </button>
                </div>
              )}
              {onGoToProducts && (
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    O produto agora é definido na secção Produtos da tua área.
                  </p>
                  <button
                    type="button"
                    onClick={onGoToProducts}
                    className="shrink-0 text-xs font-medium underline underline-offset-2 hover:text-foreground"
                  >
                    Ir para Produtos
                  </button>
                </div>
              )}
            </div>
          )}

          <Tabs defaultValue="negocio" className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 grid shrink-0 grid-cols-2">
              <TabsTrigger value="negocio">
                <TabLabel label="Negócio" complete={stepComplete.negocio} />
              </TabsTrigger>
              <TabsTrigger value="objecoes">
                <TabLabel label="Objecções" complete={stepComplete.objecoes} />
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6 pb-6">

              {/* ── Tab 1: Negócio (expandido) ── */}
              <TabsContent value="negocio" className="mt-4 space-y-4">

                {/* Alerta de alterações pedidas pelo coach */}
                {reviewStatus === "alteracoes_pedidas" && reviewNotes && (
                  <div className="flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-orange-600" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                        O teu coach pediu alterações
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-300">{reviewNotes}</p>
                    </div>
                  </div>
                )}

                {/* ─ Dados Gerais ─ */}
                <SectionDivider label="Dados Gerais" />

                <div className="space-y-1.5">
                  <FieldLabel required>Nome do Negócio</FieldLabel>
                  <Input
                    value={negocio.nome_negocio ?? ""}
                    onChange={(e) =>
                      setNegocioAndSave({ ...negocio, nome_negocio: e.target.value })
                    }
                    placeholder="Ex: Mentor Digital"
                    disabled={isReadOnly}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel required>Nicho</FieldLabel>
                  <Select
                    value={nichoSelectValue ?? ""}
                    onValueChange={(v) => {
                      if (v === "Outro") {
                        setNegocioAndSave({ ...negocio, nicho: nichoOutroInput || "" });
                      } else {
                        setNegocioAndSave({ ...negocio, nicho: v });
                        setNichoOutroInput("");
                      }
                    }}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {NICHOS.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {nichoSelectValue === "Outro" && !isReadOnly && (
                    <Input
                      value={nichoOutroInput}
                      onChange={(e) => {
                        setNichoOutroInput(e.target.value);
                        setNegocioAndSave({ ...negocio, nicho: e.target.value });
                      }}
                      placeholder="Descreve o teu nicho..."
                      className="mt-2 text-sm"
                    />
                  )}
                </div>

                {(
                  [
                    ["proposta_valor", "Proposta de Valor", true, "O que ofereces e a quem..."],
                    ["diferencial", "Diferencial Competitivo", false, "O que te distingue da concorrência..."],
                    ["historia", "A Tua História", false, "Como chegaste até aqui..."],
                    ["resultados_passados", "Resultados já obtidos", false, "Provas sociais e conquistas..."],
                  ] as [keyof BriefingNegocio, string, boolean, string][]
                ).map(([key, label, req, placeholder]) => (
                  <div key={key} className="space-y-1.5">
                    <FieldLabel required={req}>{label}</FieldLabel>
                    <Textarea
                      value={(negocio[key] as string) ?? ""}
                      onChange={(e) =>
                        setNegocioAndSave({ ...negocio, [key]: e.target.value })
                      }
                      placeholder={placeholder}
                      disabled={isReadOnly}
                      className="text-sm"
                      rows={3}
                    />
                  </div>
                ))}

                {/* ─ Posicionamento ─ */}
                <SectionDivider label="Posicionamento" />

                {(
                  [
                    ["missao", "Missão", "Para que existes como negócio? Que impacto queres ter?"],
                    ["visao", "Visão", "Como te vês daqui a 3-5 anos?"],
                  ] as [keyof BriefingNegocio, string, string][]
                ).map(([key, label, placeholder]) => (
                  <div key={key} className="space-y-1.5">
                    <FieldLabel>{label}</FieldLabel>
                    <Textarea
                      value={(negocio[key] as string) ?? ""}
                      onChange={(e) =>
                        setNegocioAndSave({ ...negocio, [key]: e.target.value })
                      }
                      placeholder={placeholder}
                      disabled={isReadOnly}
                      className="text-sm"
                      rows={2}
                    />
                  </div>
                ))}

                {/* ─ Público e Transformação ─ */}
                <SectionDivider label="Público e Transformação" />

                <div className="space-y-1.5">
                  <FieldLabel required>Público-alvo (visão geral)</FieldLabel>
                  <Textarea
                    value={negocio.publico_alvo ?? ""}
                    onChange={(e) =>
                      setNegocioAndSave({ ...negocio, publico_alvo: e.target.value })
                    }
                    placeholder="Quem é a tua pessoa? Que vida tem, que trabalho faz, que desafio enfrenta?"
                    disabled={isReadOnly}
                    className="text-sm"
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>Dores que o teu negócio resolve</FieldLabel>
                  <TagInput
                    tags={negocio.dores_resolvidas ?? []}
                    onChange={(v) =>
                      setNegocioAndSave({ ...negocio, dores_resolvidas: v })
                    }
                    placeholder="Adicionar dor resolvida..."
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel required>Transformação entregue</FieldLabel>
                  <Textarea
                    value={negocio.transformacao_entregue ?? ""}
                    onChange={(e) =>
                      setNegocioAndSave({ ...negocio, transformacao_entregue: e.target.value })
                    }
                    placeholder="Antes: [situação]. Depois: [resultado]. Ex: antes sem audiência, depois com 1000 leads qualificados."
                    disabled={isReadOnly}
                    className="text-sm"
                    rows={3}
                  />
                </div>

                {/* ─ Objetivos e Valores ─ */}
                <SectionDivider label="Objetivos e Valores" />

                {/* Objetivos */}
                <div className="space-y-2">
                  <FieldLabel>Objetivos</FieldLabel>
                  {(negocio.objetivos ?? []).length === 0 && isReadOnly && (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                  {(negocio.objetivos ?? []).map((obj, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={obj.descricao}
                          onChange={(e) => {
                            const updated = [...(negocio.objetivos ?? [])];
                            updated[i] = { ...updated[i], descricao: e.target.value };
                            setNegocioAndSave({ ...negocio, objetivos: updated });
                          }}
                          placeholder="Ex: Atingir 50k de faturamento mensal até Q4"
                          disabled={isReadOnly}
                          className="text-sm"
                        />
                        {!isReadOnly && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Prioridade</span>
                            <Select
                              value={obj.prioridade}
                              onValueChange={(v) => {
                                const updated = [...(negocio.objetivos ?? [])];
                                updated[i] = {
                                  ...updated[i],
                                  prioridade: v as "alta" | "media" | "baixa",
                                };
                                setNegocioAndSave({ ...negocio, objetivos: updated });
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRIORIDADE_OPTIONS.map((p) => (
                                  <SelectItem key={p.value} value={p.value}>
                                    {p.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {isReadOnly && (
                          <span className="text-xs text-muted-foreground">
                            Prioridade:{" "}
                            {PRIORIDADE_OPTIONS.find((p) => p.value === obj.prioridade)?.label ??
                              obj.prioridade}
                          </span>
                        )}
                      </div>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (negocio.objetivos ?? []).filter((_, j) => j !== i);
                            setNegocioAndSave({ ...negocio, objetivos: updated });
                          }}
                          className="mt-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setNegocioAndSave({
                          ...negocio,
                          objetivos: [
                            ...(negocio.objetivos ?? []),
                            { descricao: "", prioridade: "media" },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-1.5 size-3" />
                      Adicionar Objetivo
                    </Button>
                  )}
                </div>

                {/* Valores */}
                <div className="space-y-2">
                  <FieldLabel>Valores</FieldLabel>
                  {(negocio.valores ?? []).length === 0 && isReadOnly && (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                  {(negocio.valores ?? []).map((val, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={val.palavra}
                          onChange={(e) => {
                            const updated = [...(negocio.valores ?? [])];
                            updated[i] = { ...updated[i], palavra: e.target.value };
                            setNegocioAndSave({ ...negocio, valores: updated });
                          }}
                          placeholder="Ex: Clareza"
                          disabled={isReadOnly}
                          className="text-sm font-medium"
                        />
                        <Input
                          value={val.explicacao ?? ""}
                          onChange={(e) => {
                            const updated = [...(negocio.valores ?? [])];
                            updated[i] = { ...updated[i], explicacao: e.target.value };
                            setNegocioAndSave({ ...negocio, valores: updated });
                          }}
                          placeholder="O que este valor significa para ti? (opcional)"
                          disabled={isReadOnly}
                          className="text-sm"
                        />
                      </div>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (negocio.valores ?? []).filter((_, j) => j !== i);
                            setNegocioAndSave({ ...negocio, valores: updated });
                          }}
                          className="mt-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setNegocioAndSave({
                          ...negocio,
                          valores: [...(negocio.valores ?? []), { palavra: "", explicacao: "" }],
                        })
                      }
                    >
                      <Plus className="mr-1.5 size-3" />
                      Adicionar Valor
                    </Button>
                  )}
                </div>

                {/* ─ Análise SWOT ─ */}
                <SectionDivider label="Análise SWOT" />

                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["forcas", "Forças", "O que fazes melhor que os outros?"],
                      ["fraquezas", "Fraquezas", "O que precisas de melhorar?"],
                      ["oportunidades", "Oportunidades", "Tendências ou lacunas que podes aproveitar?"],
                      ["ameacas", "Ameaças", "O que pode dificultar o teu crescimento?"],
                    ] as [
                      "forcas" | "fraquezas" | "oportunidades" | "ameacas",
                      string,
                      string,
                    ][]
                  ).map(([field, label, placeholder]) => (
                    <div key={field} className="space-y-1.5 rounded-lg border p-3">
                      <p className="text-xs font-semibold">{label}</p>
                      <TagInput
                        tags={negocio.swot?.[field] ?? []}
                        onChange={(v) => setSwotField(field, v)}
                        placeholder={placeholder}
                        disabled={isReadOnly}
                      />
                    </div>
                  ))}
                </div>

                {/* ─ Concorrentes e Referências ─ */}
                <SectionDivider label="Concorrentes e Referências" />

                {/* Concorrentes */}
                <div className="space-y-2">
                  <FieldLabel>Concorrentes</FieldLabel>
                  {(negocio.concorrentes ?? []).length === 0 && isReadOnly && (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                  {(negocio.concorrentes ?? []).map((c, i) => (
                    <div key={i} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={c.nome}
                          onChange={(e) => {
                            const updated = [...(negocio.concorrentes ?? [])];
                            updated[i] = { ...updated[i], nome: e.target.value };
                            setNegocioAndSave({ ...negocio, concorrentes: updated });
                          }}
                          placeholder="Nome do concorrente"
                          disabled={isReadOnly}
                          className="text-sm"
                        />
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (negocio.concorrentes ?? []).filter((_, j) => j !== i);
                              setNegocioAndSave({ ...negocio, concorrentes: updated });
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <Input
                        value={c.url ?? ""}
                        onChange={(e) => {
                          const updated = [...(negocio.concorrentes ?? [])];
                          updated[i] = { ...updated[i], url: e.target.value };
                          setNegocioAndSave({ ...negocio, concorrentes: updated });
                        }}
                        placeholder="URL (opcional)"
                        disabled={isReadOnly}
                        className="text-sm"
                      />
                      <Textarea
                        value={c.observacoes ?? ""}
                        onChange={(e) => {
                          const updated = [...(negocio.concorrentes ?? [])];
                          updated[i] = { ...updated[i], observacoes: e.target.value };
                          setNegocioAndSave({ ...negocio, concorrentes: updated });
                        }}
                        placeholder="O que fazem bem? O que podes aprender ou fazer diferente?"
                        disabled={isReadOnly}
                        className="text-sm"
                        rows={2}
                      />
                    </div>
                  ))}
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setNegocioAndSave({
                          ...negocio,
                          concorrentes: [
                            ...(negocio.concorrentes ?? []),
                            { nome: "", url: "", observacoes: "" },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-1.5 size-3" />
                      Adicionar Concorrente
                    </Button>
                  )}
                </div>

                {/* Referências */}
                <div className="space-y-2">
                  <FieldLabel>Referências / Inspirações</FieldLabel>
                  {(negocio.referencias ?? []).length === 0 && isReadOnly && (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                  {(negocio.referencias ?? []).map((r, i) => (
                    <div key={i} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={r.nome}
                          onChange={(e) => {
                            const updated = [...(negocio.referencias ?? [])];
                            updated[i] = { ...updated[i], nome: e.target.value };
                            setNegocioAndSave({ ...negocio, referencias: updated });
                          }}
                          placeholder="Nome da pessoa ou marca"
                          disabled={isReadOnly}
                          className="text-sm"
                        />
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (negocio.referencias ?? []).filter((_, j) => j !== i);
                              setNegocioAndSave({ ...negocio, referencias: updated });
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <Input
                        value={r.url ?? ""}
                        onChange={(e) => {
                          const updated = [...(negocio.referencias ?? [])];
                          updated[i] = { ...updated[i], url: e.target.value };
                          setNegocioAndSave({ ...negocio, referencias: updated });
                        }}
                        placeholder="URL (opcional)"
                        disabled={isReadOnly}
                        className="text-sm"
                      />
                      <Textarea
                        value={r.porque}
                        onChange={(e) => {
                          const updated = [...(negocio.referencias ?? [])];
                          updated[i] = { ...updated[i], porque: e.target.value };
                          setNegocioAndSave({ ...negocio, referencias: updated });
                        }}
                        placeholder="Porque te inspira? O que queres replicar ou adaptar?"
                        disabled={isReadOnly}
                        className="text-sm"
                        rows={2}
                      />
                    </div>
                  ))}
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setNegocioAndSave({
                          ...negocio,
                          referencias: [
                            ...(negocio.referencias ?? []),
                            { nome: "", url: "", porque: "" },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-1.5 size-3" />
                      Adicionar Referência
                    </Button>
                  )}
                </div>

                {/* ─ Acções do rodapé da tab Negócio ─ */}
                <div className="space-y-3 pt-2">
                  {!isReadOnly && (
                    <div className="flex flex-wrap items-center gap-2">
                      <SaveButton
                        step="negocio"
                        data={negocio as Record<string, unknown>}
                        disabled={!negocio.nome_negocio}
                      />
                      <span className="text-xs text-muted-foreground">
                        Guardado automaticamente
                      </span>
                    </div>
                  )}

                  {/* Estado: aprovado */}
                  {reviewStatus === "aprovado" && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                      <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                      <p className="text-xs text-green-700 dark:text-green-400">
                        O coach aprovou este módulo.
                      </p>
                    </div>
                  )}

                  {/* Estado: aguardando revisão */}
                  {reviewStatus === "pronto_revisao" && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                      <Send className="size-4 shrink-0 text-amber-600" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Enviado para revisão. O coach irá analisar em breve.
                      </p>
                    </div>
                  )}

                  {/* Botão enviar para revisão */}
                  {canSubmitReview && (
                    <Button
                      onClick={handleSubmitForReview}
                      disabled={submittingReview}
                      className="w-full sm:w-auto"
                    >
                      <Send className="mr-2 size-3.5" />
                      {submittingReview ? "A enviar..." : "Enviar para revisão"}
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* ── Tab 2: Objecções ── */}
              <TabsContent value="objecoes" className="mt-4 space-y-4">
                {objecoes.length === 0 && isReadOnly && (
                  <p className="text-sm text-muted-foreground">Sem objecções registadas.</p>
                )}

                {objecoes.map((item, i) => (
                  <div key={i} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Objecção {i + 1}
                      </span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => setObjecoes(objecoes.filter((_, j) => j !== i))}
                          className="text-destructive hover:opacity-70"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <Input
                      value={item.objecao}
                      onChange={(e) => {
                        const updated = [...objecoes];
                        updated[i] = { ...updated[i], objecao: e.target.value };
                        setObjecoes(updated);
                      }}
                      placeholder="Ex: É muito caro para mim..."
                      disabled={isReadOnly}
                      className="text-sm"
                    />
                    <Textarea
                      value={item.resposta}
                      onChange={(e) => {
                        const updated = [...objecoes];
                        updated[i] = { ...updated[i], resposta: e.target.value };
                        setObjecoes(updated);
                      }}
                      placeholder="A minha resposta..."
                      disabled={isReadOnly}
                      className="text-sm"
                      rows={3}
                    />
                  </div>
                ))}

                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      setObjecoes([...objecoes, { objecao: "", resposta: "" }])
                    }
                  >
                    <Plus className="mr-1.5 size-3" />
                    Adicionar Objecção
                  </Button>
                )}

                <SaveButton step="objecoes" data={{ objecoes } as unknown as Record<string, unknown>} />
              </TabsContent>

            </div>
          </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
