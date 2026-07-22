"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Plus,
  X,
  Clock,
  Send,
  Copy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SectionStatusBadge } from "@/components/ui/section-status-badge";
import { toast } from "sonner";
import {
  createLaunchWithWizardAction,
  updateLaunchWithWizardAction,
  getLaunchAudiencesAction,
  getLaunchNameIdeasAction,
  createNameIdeaAction,
  updateNameIdeaStatusAction,
  deleteNameIdeaAction,
  submitLaunchForReviewAction,
  getStudentAudienceProfilesForWizardAction,
  getMyAudienceProfilesForWizardAction,
  createMyLaunchWithWizardAction,
  updateMyLaunchWithWizardAction,
  submitMyLaunchForReviewAction,
  createMyNameIdeaAction,
  updateMyNameIdeaStatusAction,
  deleteMyNameIdeaAction,
} from "@/lib/actions/student-launch-config";
import type {
  StudentLaunch,
  StudentProduct,
  LaunchNameIdea,
  StudentLaunchAudience,
  NameIdeaStatus,
} from "@/lib/types/student-launches";
import type { ReviewStatus } from "@/lib/types/review-status";
import { ALUNO_TRANSITIONS } from "@/lib/types/review-status";

// ── Constants ─────────────────────────────────────────────────────────────────

const LAUNCH_MODELS = ["webinar", "semente", "desafio", "outro"] as const;
const EVENT_TYPES   = ["Live", "Webinar", "Desafio", "Workshop", "Outro"] as const;
const PLATFORMS     = ["Instagram", "YouTube", "Zoom", "Outro"] as const;

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  rascunho:    { label: "Rascunho",      color: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" },
  planeamento: { label: "Planeamento",   color: "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400" },
  distribuicao:{ label: "Distribuição",  color: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-400" },
  captacao:    { label: "Captação",      color: "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  aquecimento: { label: "Aquecimento",   color: "border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  evento:      { label: "Evento",        color: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  venda:       { label: "Venda",         color: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  downsell:    { label: "Downsell",      color: "border-teal-200 bg-teal-100 text-teal-700 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-400" },
  concluido:   { label: "Concluído",     color: "border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400" },
};

const IDEA_STATUS_LABELS: Record<NameIdeaStatus, string> = {
  sugestao:     "Sugestão",
  em_apreciacao:"Em apreciação",
  aprovado:     "Aprovado",
  rejeitado:    "Rejeitado",
};

const IDEA_STATUS_COLORS: Record<NameIdeaStatus, string> = {
  sugestao:     "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  em_apreciacao:"border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  aprovado:     "border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejeitado:    "border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500",
};

export function LaunchPhaseBadge({ phase }: { phase: string }) {
  const meta = PHASE_LABELS[phase];
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-px text-[10px] font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────

interface WizardForm {
  // Etapa 1
  title: string;
  launch_model: string;
  main_product_id: string;
  ticket: string;
  primary_audience_id: string;
  secondary_audience_ids: string[];
  // Etapa 2
  event_name: string;
  event_type: string;
  event_platform: string;
  event_time: string;
  big_idea: string;
  approved_promise: string;
  // Etapa 3 — ideias geridas separadamente (state)
  // Etapa 4
  start_date: string;
  capture_start_date: string;
  launch_date: string;
  cart_open_date: string;
  cart_close_date: string;
  downsell_start_date: string;
  downsell_end_date: string;
  // Etapa 5
  has_downsell: boolean;
  downsell_product_id: string;
  upsell_product_id: string;
  parcelamento: boolean;
  num_prestacoes: string;
  vagas_limitadas: boolean;
  num_vagas: string;
}

function defaultForm(launch?: StudentLaunch | null, audiences?: StudentLaunchAudience[]): WizardForm {
  const primary = audiences?.find((a) => a.is_primary)?.audience_profile_id ?? "";
  const secondary = audiences?.filter((a) => !a.is_primary).map((a) => a.audience_profile_id) ?? [];

  return {
    title:                  launch?.title ?? "",
    launch_model:           launch?.launch_model ?? "",
    main_product_id:        launch?.main_product_id ?? "",
    ticket:                 launch?.ticket?.toString() ?? "",
    primary_audience_id:    primary,
    secondary_audience_ids: secondary,
    event_name:             launch?.event_name ?? "",
    event_type:             launch?.event_type ?? "",
    event_platform:         launch?.event_platform ?? "",
    event_time:             launch?.event_time ?? "",
    big_idea:               launch?.big_idea ?? "",
    approved_promise:       launch?.approved_promise ?? "",
    start_date:             launch?.start_date ?? "",
    capture_start_date:     launch?.capture_start_date ?? "",
    launch_date:            launch?.launch_date ?? "",
    cart_open_date:         launch?.cart_open_date ?? "",
    cart_close_date:        launch?.cart_close_date ?? "",
    downsell_start_date:    launch?.downsell_start_date ?? "",
    downsell_end_date:      launch?.downsell_end_date ?? "",
    has_downsell:           !!launch?.downsell_product_id,
    downsell_product_id:    launch?.downsell_product_id ?? "",
    upsell_product_id:      launch?.upsell_product_id ?? "",
    parcelamento:           false,
    num_prestacoes:         "",
    vagas_limitadas:        false,
    num_vagas:              "",
  };
}

function buildAudiences(form: WizardForm): { profile_id: string; is_primary: boolean }[] {
  const result: { profile_id: string; is_primary: boolean }[] = [];
  if (form.primary_audience_id) {
    result.push({ profile_id: form.primary_audience_id, is_primary: true });
  }
  for (const id of form.secondary_audience_ids) {
    if (id && id !== form.primary_audience_id) {
      result.push({ profile_id: id, is_primary: false });
    }
  }
  return result;
}

// ── Wizard component ──────────────────────────────────────────────────────────

interface LaunchWizardProps {
  open: boolean;
  launch: StudentLaunch | null;
  studentId: string;
  products: StudentProduct[];
  isCoach?: boolean;
  onClose: () => void;
  onSaved: (launch: StudentLaunch) => void;
}

export function LaunchWizard({
  open,
  launch,
  studentId,
  products,
  isCoach = false,
  onClose,
  onSaved,
}: LaunchWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(() => defaultForm());
  const [audienceProfiles, setAudienceProfiles] = useState<{ id: string; name: string; is_primary: boolean }[]>([]);
  const [nameIdeas, setNameIdeas] = useState<LaunchNameIdea[]>([]);
  const [existingAudiences, setExistingAudiences] = useState<StudentLaunchAudience[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newIdeaText, setNewIdeaText] = useState({ nome: "", promessa: "" });

  const STEPS = ["Identificação", "Evento", "Ideias", "Calendário", "Oferta", "Confirmação"];
  const totalSteps = STEPS.length;

  const loadData = useCallback(async () => {
    setLoading(true);
    const profilesFn = isCoach
      ? getStudentAudienceProfilesForWizardAction(studentId)
      : getMyAudienceProfilesForWizardAction();

    const promises: Promise<unknown>[] = [profilesFn];
    if (launch) {
      promises.push(getLaunchAudiencesAction(launch.id));
      promises.push(getLaunchNameIdeasAction(launch.id));
    }

    const [profiles, audiences, ideas] = await Promise.all(promises);
    setAudienceProfiles(profiles as { id: string; name: string; is_primary: boolean }[]);

    const aud = (audiences ?? []) as StudentLaunchAudience[];
    setExistingAudiences(aud);
    setNameIdeas((ideas ?? []) as LaunchNameIdea[]);
    setForm(defaultForm(launch, aud));
    setLoading(false);
  }, [launch, studentId, isCoach]);

  useEffect(() => {
    if (open) {
      setStep(0);
      loadData();
    }
  }, [open, loadData]);

  const set = <K extends keyof WizardForm>(key: K, value: WizardForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const activeProducts = products.filter((p) => !p.is_archived && p.product_status === "activo");
  const allProducts    = products.filter((p) => !p.is_archived);

  function validateStep(): string | null {
    if (step === 0 && !form.title.trim()) return "Nome interno obrigatório";
    if (step === 3) {
      if (form.cart_close_date && form.cart_open_date && form.cart_close_date < form.cart_open_date) {
        return "Fecho do carrinho não pode ser anterior à abertura";
      }
    }
    return null;
  }

  function getDateConflicts(): string[] {
    const warnings: string[] = [];
    if (form.start_date && form.launch_date && form.launch_date < form.start_date) {
      warnings.push("Dia D é anterior ao início de distribuição");
    }
    if (form.capture_start_date && form.launch_date && form.launch_date < form.capture_start_date) {
      warnings.push("Dia D é anterior à captação paga");
    }
    if (form.cart_open_date && form.cart_close_date && form.cart_close_date < form.cart_open_date) {
      warnings.push("Fecho do carrinho é anterior à abertura");
    }
    if (form.has_downsell && form.downsell_start_date && form.cart_close_date && form.downsell_start_date < form.cart_close_date) {
      warnings.push("Downsell começa antes do fecho do carrinho");
    }
    return warnings;
  }

  async function handleNext() {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    if (step < totalSteps - 1) setStep((s) => s + 1);
  }

  async function handleSave() {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setSaving(true);

    const mainProduct = allProducts.find((p) => p.id === form.main_product_id);
    const snapshot: Record<string, unknown> | null = mainProduct
      ? { nome: mainProduct.name, preco: mainProduct.price, nivel: mainProduct.value_ladder_position, formato: mainProduct.product_type }
      : null;

    const audiences = buildAudiences(form);

    const payload = {
      title:               form.title.trim(),
      launch_model:        form.launch_model || null,
      main_product_id:     form.main_product_id || null,
      ticket:              form.ticket ? Number(form.ticket) : null,
      downsell_product_id: form.has_downsell && form.downsell_product_id ? form.downsell_product_id : null,
      upsell_product_id:   form.upsell_product_id || null,
      event_name:          form.event_name || null,
      event_type:          form.event_type || null,
      event_platform:      form.event_platform || null,
      event_time:          form.event_time || null,
      big_idea:            form.big_idea || null,
      approved_promise:    form.approved_promise || null,
      start_date:          form.start_date || null,
      capture_start_date:  form.capture_start_date || null,
      launch_date:         form.launch_date || null,
      cart_open_date:      form.cart_open_date || null,
      cart_close_date:     form.cart_close_date || null,
      downsell_start_date: form.has_downsell ? (form.downsell_start_date || null) : null,
      downsell_end_date:   form.has_downsell ? (form.downsell_end_date || null) : null,
      status:              "planeado",
    };

    let result;
    if (launch) {
      result = isCoach
        ? await updateLaunchWithWizardAction(launch.id, studentId, payload, audiences)
        : await updateMyLaunchWithWizardAction(launch.id, payload, audiences);
      if ("error" in result) { toast.error(result.error); setSaving(false); return; }
      toast.success("Lançamento guardado");
      onSaved({ ...launch, ...payload } as StudentLaunch);
    } else {
      result = isCoach
        ? await createLaunchWithWizardAction(studentId, { ...payload, snapshot_at_creation: snapshot, audiences })
        : await createMyLaunchWithWizardAction({ ...payload, snapshot_at_creation: snapshot, audiences });
      if ("error" in result) { toast.error(result.error); setSaving(false); return; }
      toast.success("Lançamento criado");
      onSaved((result as { data: StudentLaunch }).data);
    }

    setSaving(false);
    onClose();
  }

  async function handleSubmitForReview() {
    if (!launch) return;
    setSubmitting(true);
    const result = isCoach
      ? await submitLaunchForReviewAction(launch.id, studentId)
      : await submitMyLaunchForReviewAction(launch.id);
    setSubmitting(false);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Enviado para revisão");
    onClose();
  }

  // ── Name Ideas handlers ───────────────────────────────────────────────────

  async function handleAddIdea(type: "nome" | "promessa") {
    if (!launch) return;
    const content = type === "nome" ? newIdeaText.nome : newIdeaText.promessa;
    if (!content.trim()) return;
    const result = isCoach
      ? await createNameIdeaAction(launch.id, studentId, type, content)
      : await createMyNameIdeaAction(launch.id, type, content);
    if ("error" in result) { toast.error(result.error); return; }
    setNameIdeas((prev) => [...prev, (result as { data: LaunchNameIdea }).data]);
    setNewIdeaText((prev) => ({ ...prev, [type]: "" }));
  }

  async function handleIdeaStatus(idea: LaunchNameIdea, status: NameIdeaStatus) {
    if (!launch) return;
    // Warn if approving and another is already approved
    if (status === "aprovado") {
      const alreadyApproved = nameIdeas.find(
        (i) => i.id !== idea.id && i.type === idea.type && i.status === "aprovado",
      );
      if (alreadyApproved && !confirm(`Já existe uma ${idea.type === "nome" ? "nome" : "promessa"} aprovada. Substituir?`)) {
        return;
      }
    }
    const result = isCoach
      ? await updateNameIdeaStatusAction(idea.id, launch.id, studentId, status, idea.notes)
      : await updateMyNameIdeaStatusAction(idea.id, launch.id, status, idea.notes);
    if ("error" in result) { toast.error(result.error); return; }
    setNameIdeas((prev) =>
      prev.map((i) => {
        if (i.id === idea.id) return { ...i, status };
        if (status === "aprovado" && i.type === idea.type && i.status === "aprovado") return { ...i, status: "rejeitado" as NameIdeaStatus };
        return i;
      }),
    );
  }

  async function handleDeleteIdea(id: string) {
    if (!launch) return;
    const result = isCoach
      ? await deleteNameIdeaAction(id, studentId)
      : await deleteMyNameIdeaAction(id);
    if ("error" in result) { toast.error(result.error); return; }
    setNameIdeas((prev) => prev.filter((i) => i.id !== id));
  }

  const canSubmitForReview =
    !isCoach &&
    launch &&
    ALUNO_TRANSITIONS[launch.review_status as ReviewStatus]?.includes("pronto_revisao");

  const dateConflicts = getDateConflicts();

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="flex-none border-b px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle>
                {launch ? "Editar Lançamento" : "Novo Lançamento"}
              </DialogTitle>
              <DialogDescription>
                {launch ? "Editar as configurações deste lançamento." : "Configurar um novo lançamento."}
              </DialogDescription>
              {launch && (
                <div className="flex items-center gap-2">
                  <SectionStatusBadge status={launch.review_status as ReviewStatus} />
                </div>
              )}
            </div>
            {canSubmitForReview && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSubmitForReview}
                disabled={submitting}
                className="shrink-0"
              >
                <Send className="mr-1.5 size-3.5" />
                {submitting ? "A enviar…" : "Enviar para revisão"}
              </Button>
            )}
          </div>

          {/* Stepper */}
          <div className="mt-3 flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-1">
                <button
                  onClick={() => { const err = validateStep(); if (!err || i < step) setStep(i); }}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors ${
                    i < step
                      ? "border-foreground bg-foreground text-background"
                      : i === step
                      ? "border-foreground text-foreground"
                      : "border-muted-foreground/30 text-muted-foreground/50"
                  }`}
                >
                  {i < step ? <Check className="size-3" /> : i + 1}
                </button>
                <span className={`hidden text-[10px] sm:inline ${i === step ? "font-medium text-foreground" : "text-muted-foreground/60"}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`mx-1 h-px w-4 ${i < step ? "bg-foreground" : "bg-muted-foreground/20"}`} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : (
            <>
              {/* ── Etapa 1: Identificação ── */}
              {step === 0 && (
                <div className="space-y-4">
                  <StepTitle>Identificação do Lançamento</StepTitle>

                  <Field label="Nome interno *">
                    <Input
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="ex: Lançamento Março 2026"
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Modelo de lançamento">
                      <Select value={form.launch_model || "none"} onValueChange={(v) => set("launch_model", v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {LAUNCH_MODELS.map((m) => (
                            <SelectItem key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Produto principal">
                      <Select
                        value={form.main_product_id || "none"}
                        onValueChange={(v) => {
                          const pid = v === "none" ? "" : v;
                          const product = allProducts.find((p) => p.id === pid);
                          set("main_product_id", pid);
                          if (product?.price != null && !form.ticket) {
                            set("ticket", product.price.toString());
                          }
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="— Seleccionar —" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Nenhum —</SelectItem>
                          {allProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}{p.price != null ? ` · ${p.price}€` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Audiências */}
                  <Field label="Audiência principal">
                    <Select
                      value={form.primary_audience_id || "none"}
                      onValueChange={(v) => set("primary_audience_id", v === "none" ? "" : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="— Seleccionar —" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Nenhuma —</SelectItem>
                        {audienceProfiles.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}{a.is_primary ? " ★" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Audiências secundárias</label>
                    <div className="flex flex-wrap gap-2">
                      {audienceProfiles
                        .filter((a) => a.id !== form.primary_audience_id)
                        .map((a) => {
                          const sel = form.secondary_audience_ids.includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                const next = sel
                                  ? form.secondary_audience_ids.filter((id) => id !== a.id)
                                  : [...form.secondary_audience_ids, a.id];
                                set("secondary_audience_ids", next);
                              }}
                              className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                                sel
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-input bg-background text-muted-foreground hover:border-foreground"
                              }`}
                            >
                              {a.name}
                            </button>
                          );
                        })}
                      {audienceProfiles.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sem perfis de audiência criados ainda.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Etapa 2: Evento ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <StepTitle>Evento</StepTitle>

                  <Field label="Nome público do evento">
                    <Input
                      value={form.event_name}
                      onChange={(e) => set("event_name", e.target.value)}
                      placeholder="ex: Fórmula do Impacto"
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Tipo de evento">
                      <Select value={form.event_type || "none"} onValueChange={(v) => set("event_type", v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Plataforma">
                      <Select value={form.event_platform || "none"} onValueChange={(v) => set("event_platform", v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Hora do evento">
                      <div className="relative">
                        <Input
                          type="time"
                          value={form.event_time}
                          onChange={(e) => set("event_time", e.target.value)}
                          className="pr-8"
                        />
                        <Clock className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                    </Field>
                  </div>

                  <Field label="Big Idea">
                    <Textarea
                      value={form.big_idea}
                      onChange={(e) => set("big_idea", e.target.value)}
                      rows={3}
                      placeholder="O conceito central deste lançamento…"
                    />
                  </Field>

                  <Field label="Promessa aprovada">
                    <Textarea
                      value={form.approved_promise}
                      onChange={(e) => set("approved_promise", e.target.value)}
                      rows={2}
                      placeholder="Promessa final aprovada pelo coach…"
                    />
                  </Field>
                </div>
              )}

              {/* ── Etapa 3: Ideias ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <StepTitle>Ideias de Nome e Promessa</StepTitle>

                  {!launch && (
                    <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                      Guarda primeiro o lançamento para poder gerir as ideias.
                    </div>
                  )}

                  {launch && (
                    <>
                      {(["nome", "promessa"] as const).map((type) => {
                        const ideas = nameIdeas.filter((i) => i.type === type);
                        return (
                          <div key={type} className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {type === "nome" ? "Sugestões de nome do evento" : "Sugestões de promessa"}
                            </p>

                            {ideas.length === 0 && (
                              <p className="text-sm text-muted-foreground">Sem sugestões ainda.</p>
                            )}

                            {ideas.map((idea) => (
                              <div
                                key={idea.id}
                                className={`rounded border px-3 py-2 ${idea.status === "rejeitado" ? "opacity-50" : ""}`}
                              >
                                <div className="flex items-start gap-2">
                                  <p className="flex-1 text-sm">{idea.content}</p>
                                  <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-px text-[10px] font-medium ${IDEA_STATUS_COLORS[idea.status]}`}>
                                    {IDEA_STATUS_LABELS[idea.status]}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {(["sugestao", "em_apreciacao", "aprovado", "rejeitado"] as NameIdeaStatus[])
                                    .filter((s) => s !== idea.status)
                                    .map((s) => (
                                      <button
                                        key={s}
                                        onClick={() => handleIdeaStatus(idea, s)}
                                        className="rounded border border-input bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                                      >
                                        → {IDEA_STATUS_LABELS[s]}
                                      </button>
                                    ))}
                                  <button
                                    onClick={() => handleDeleteIdea(idea.id)}
                                    className="rounded border border-input bg-background px-2 py-0.5 text-[10px] text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    Apagar
                                  </button>
                                </div>
                              </div>
                            ))}

                            <div className="flex gap-2">
                              <Input
                                value={newIdeaText[type]}
                                onChange={(e) => setNewIdeaText((prev) => ({ ...prev, [type]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddIdea(type); } }}
                                placeholder={`Nova sugestão de ${type}…`}
                                className="h-8 flex-1 text-sm"
                              />
                              <Button size="sm" variant="outline" onClick={() => handleAddIdea(type)} className="h-8">
                                <Plus className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* ── Etapa 4: Calendário ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <StepTitle>Calendário</StepTitle>

                  {dateConflicts.length > 0 && (
                    <div className="space-y-1">
                      {dateConflicts.map((w) => (
                        <div key={w} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="size-3.5 shrink-0" /> {w}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {([
                      ["start_date",          "Início da distribuição *"],
                      ["capture_start_date",  "Início da captação paga"],
                      ["launch_date",         "Dia D (evento)"],
                      ["cart_open_date",      "Abertura do carrinho"],
                      ["cart_close_date",     "Fecho do carrinho"],
                    ] as [keyof WizardForm, string][]).map(([key, label]) => (
                      <Field key={key} label={label}>
                        <Input
                          type="date"
                          value={form[key] as string}
                          onChange={(e) => set(key, e.target.value)}
                        />
                      </Field>
                    ))}
                  </div>

                  {form.has_downsell && (
                    <div className="grid gap-3 rounded border border-dashed p-3 sm:grid-cols-2">
                      <p className="text-xs font-medium text-muted-foreground sm:col-span-2">Downsell</p>
                      <Field label="Início do downsell">
                        <Input type="date" value={form.downsell_start_date} onChange={(e) => set("downsell_start_date", e.target.value)} />
                      </Field>
                      <Field label="Fim do downsell">
                        <Input type="date" value={form.downsell_end_date} onChange={(e) => set("downsell_end_date", e.target.value)} />
                      </Field>
                    </div>
                  )}

                  {/* Timeline visual */}
                  {(form.start_date || form.launch_date || form.cart_open_date) && (
                    <div className="rounded border bg-muted/30 p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Linha de Tempo</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {[
                          [form.start_date, "Distribuição"],
                          [form.capture_start_date, "Captação"],
                          [form.launch_date, "Dia D"],
                          [form.cart_open_date, "Abertura"],
                          [form.cart_close_date, "Fecho"],
                          form.has_downsell ? [form.downsell_start_date, "Downsell"] : null,
                        ].filter(Boolean).filter(([d]) => !!d).map(([date, label], i) => (
                          <span key={i} className="flex items-center gap-1.5">
                            {i > 0 && <span className="text-muted-foreground/40">→</span>}
                            <span className="rounded bg-muted px-1.5 py-0.5">
                              <span className="font-medium">{label}</span>
                              <span className="ml-1 text-muted-foreground">{date as string}</span>
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Etapa 5: Oferta ── */}
              {step === 4 && (
                <div className="space-y-4">
                  <StepTitle>Oferta</StepTitle>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Preço do lançamento (€)">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.ticket}
                        onChange={(e) => set("ticket", e.target.value)}
                        placeholder="0.00"
                      />
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Independente do preço base do produto.
                      </p>
                    </Field>

                    <Field label="Upsell">
                      <Select value={form.upsell_product_id || "none"} onValueChange={(v) => set("upsell_product_id", v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="— Nenhum —" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Nenhum —</SelectItem>
                          {allProducts.filter((p) => p.id !== form.main_product_id).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="space-y-3 rounded border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Downsell</Label>
                        <p className="text-xs text-muted-foreground">Activa produto de downsell e datas no calendário</p>
                      </div>
                      <Switch checked={form.has_downsell} onCheckedChange={(v) => set("has_downsell", v)} />
                    </div>
                    {form.has_downsell && (
                      <Field label="Produto de downsell">
                        <Select value={form.downsell_product_id || "none"} onValueChange={(v) => set("downsell_product_id", v === "none" ? "" : v)}>
                          <SelectTrigger><SelectValue placeholder="— Seleccionar —" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Nenhum —</SelectItem>
                            {allProducts.filter((p) => p.id !== form.main_product_id).map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </div>

                  <div className="space-y-3 rounded border p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Parcelamento</Label>
                      <Switch checked={form.parcelamento} onCheckedChange={(v) => set("parcelamento", v)} />
                    </div>
                    {form.parcelamento && (
                      <Field label="Número de prestações">
                        <Input type="number" min={2} value={form.num_prestacoes} onChange={(e) => set("num_prestacoes", e.target.value)} className="max-w-[100px]" />
                      </Field>
                    )}
                  </div>

                  <div className="space-y-3 rounded border p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Vagas limitadas</Label>
                      <Switch checked={form.vagas_limitadas} onCheckedChange={(v) => set("vagas_limitadas", v)} />
                    </div>
                    {form.vagas_limitadas && (
                      <Field label="Número de vagas">
                        <Input type="number" min={1} value={form.num_vagas} onChange={(e) => set("num_vagas", e.target.value)} className="max-w-[100px]" />
                      </Field>
                    )}
                  </div>
                </div>
              )}

              {/* ── Etapa 6: Confirmação ── */}
              {step === 5 && (
                <div className="space-y-5">
                  <StepTitle>Confirmação</StepTitle>

                  {dateConflicts.length > 0 && (
                    <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
                        <AlertTriangle className="size-3.5" /> Conflitos de datas (aviso, não bloqueio)
                      </p>
                      {dateConflicts.map((w) => (
                        <p key={w} className="text-xs text-amber-700 dark:text-amber-400">{w}</p>
                      ))}
                    </div>
                  )}

                  <SummarySection title="Identificação">
                    <SummaryRow label="Nome" value={form.title || "—"} />
                    <SummaryRow label="Modelo" value={form.launch_model || "—"} />
                    <SummaryRow label="Produto" value={allProducts.find((p) => p.id === form.main_product_id)?.name ?? "—"} />
                    <SummaryRow label="Ticket" value={form.ticket ? `${form.ticket}€` : "—"} />
                    <SummaryRow label="Audiência principal" value={audienceProfiles.find((a) => a.id === form.primary_audience_id)?.name ?? "—"} />
                  </SummarySection>

                  <SummarySection title="Evento">
                    <SummaryRow label="Nome público" value={form.event_name || "—"} />
                    <SummaryRow label="Tipo" value={form.event_type || "—"} />
                    <SummaryRow label="Plataforma" value={form.event_platform || "—"} />
                    <SummaryRow label="Hora" value={form.event_time || "—"} />
                  </SummarySection>

                  <SummarySection title="Calendário">
                    <SummaryRow label="Início distribuição" value={form.start_date || "—"} />
                    <SummaryRow label="Início captação" value={form.capture_start_date || "—"} />
                    <SummaryRow label="Dia D" value={form.launch_date || "—"} />
                    <SummaryRow label="Abertura carrinho" value={form.cart_open_date || "—"} />
                    <SummaryRow label="Fecho carrinho" value={form.cart_close_date || "—"} />
                  </SummarySection>

                  <SummarySection title="Oferta">
                    <SummaryRow label="Ticket" value={form.ticket ? `${form.ticket}€` : "—"} />
                    <SummaryRow label="Upsell" value={allProducts.find((p) => p.id === form.upsell_product_id)?.name ?? "—"} />
                    {form.has_downsell && <SummaryRow label="Downsell" value={allProducts.find((p) => p.id === form.downsell_product_id)?.name ?? "—"} />}
                    {form.parcelamento && <SummaryRow label="Parcelamento" value={`${form.num_prestacoes || "?"} prestações`} />}
                    {form.vagas_limitadas && <SummaryRow label="Vagas" value={form.num_vagas || "?"} />}
                  </SummarySection>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none border-t px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => { if (step === 0) onClose(); else setStep((s) => s - 1); }}
          >
            {step === 0 ? "Cancelar" : <><ChevronLeft className="mr-1 size-4" />Anterior</>}
          </Button>

          {step < totalSteps - 1 ? (
            <Button onClick={handleNext}>
              Seguinte <ChevronRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "A guardar…" : launch ? "Guardar" : "Criar Lançamento"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Summary helpers ───────────────────────────────────────────────────────────

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="rounded border divide-y">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
