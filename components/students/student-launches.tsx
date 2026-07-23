"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  AlertTriangle,
  Package,
  Pencil,
  X,
  Copy,
  Settings2,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getStudentProductsAction,
  createStudentProductAction,
  updateStudentProductAction,
  deleteStudentProductAction,
  getStudentLaunchesAction,
  createStudentLaunchAction,
  updateStudentLaunchAction,
  requestLaunchDeletionAction,
  deleteLaunchAction,
  cancelLaunchDeletionRequestAction,
  getLaunchDebriefAction,
  upsertLaunchDebriefAction,
} from "@/lib/actions/student-launches";
import { duplicateLaunchAction, updateLaunchReviewStatusAction } from "@/lib/actions/student-launch-config";
import {
  calcDebrief,
  calcLaunchPhase,
  type StudentLaunch,
  type StudentLaunchDebrief,
  type StudentProduct,
  type LaunchStatus,
} from "@/lib/types/student-launches";
import { SectionStatusBadge } from "@/components/ui/section-status-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LaunchWizard, LaunchPhaseBadge } from "./launch-wizard";
import { LaunchGoalsCalculator } from "@/components/incubadora/launch-goals-calculator";
import type { ReviewStatus } from "@/lib/types/review-status";
import { COACH_TRANSITIONS } from "@/lib/types/review-status";

// ── Constants ─────────────────────────────────────────────────────────────────

const LAUNCH_TYPES = ["meteórico", "desafio", "webinar", "perpétuo", "outro"] as const;
const CHANNELS = ["Instagram", "YouTube", "WhatsApp", "Email", "Facebook", "TikTok", "LinkedIn", "Outro"];

const STATUS_LABELS: Record<LaunchStatus, string> = {
  planeado:  "Planeado",
  em_curso:  "Em curso",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 0, suffix = "") {
  if (n == null) return "—";
  return n.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
}

function fmtEur(n: number | null | undefined) {
  return fmt(n, 2, "€");
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return (n * 100).toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

function calcBudgetTotal(l: StudentLaunch) {
  return (
    (l.budget_distribuicao ?? 0) +
    (l.budget_captacao ?? 0) +
    (l.budget_antecipacao ?? 0) +
    (l.budget_remarketing ?? 0) || null
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LaunchStatusBadge({ status }: { status: LaunchStatus }) {
  const classes: Record<LaunchStatus, string> = {
    em_curso:  "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    concluido: "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
    cancelado: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    planeado:  "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <Badge className={`rounded-full border text-xs ${classes[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function CalcField({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </label>
      <div className="mt-1 flex h-8 cursor-not-allowed items-center rounded-md border border-input bg-muted/60 px-3 text-sm text-muted-foreground select-none">
        {value}
      </div>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BudgetCompare({ label, planned, real }: { label: string; planned: number | null; real: number | null }) {
  if (planned == null && real == null) return null;
  return (
    <div className="flex items-start justify-between gap-4 rounded border bg-muted/30 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right text-xs">
        {planned != null && <div className="text-muted-foreground">Plan: {fmtEur(planned)}</div>}
        {real != null && <div className="font-medium">Real: {fmtEur(real)}</div>}
      </div>
    </div>
  );
}

// ── Product Dialog ────────────────────────────────────────────────────────────

interface ProductDialogProps {
  studentId: string;
  product: StudentProduct | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function ProductDialog({ studentId, product, open, onClose, onSaved }: ProductDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    product_type: "",
    value_ladder_position: "",
    garantia: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: product?.name ?? "",
        description: product?.description ?? "",
        price: product?.price?.toString() ?? "",
        product_type: product?.product_type ?? "",
        value_ladder_position: product?.value_ladder_position?.toString() ?? "",
        garantia: product?.garantia ?? "",
      });
    }
  }, [open, product]);

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      promise: product?.promise ?? null,
      price: form.price ? Number(form.price) : null,
      product_type: form.product_type || null,
      value_ladder_position: form.value_ladder_position ? Number(form.value_ladder_position) : null,
      garantia: form.garantia || null,
      beneficios: product?.beneficios ?? [],
      bonus: product?.bonus ?? [],
      product_status: product?.product_status ?? "rascunho",
      review_status: product?.review_status ?? "nao_iniciado",
      review_notes: product?.review_notes ?? null,
      previous_product_id: product?.previous_product_id ?? null,
      next_product_id: product?.next_product_id ?? null,
      content_modules: product?.content_modules ?? [],
      condicoes: product?.condicoes ?? {},
      upsells: product?.upsells ?? [],
      downsells: product?.downsells ?? [],
      audiencias: product?.audiencias ?? [],
      links: product?.links ?? {},
      estrategia_venda: product?.estrategia_venda ?? null,
      modo_entrega: product?.modo_entrega ?? null,
      is_archived: product?.is_archived ?? false,
      sort_order: product?.sort_order ?? 0,
    };
    const result = product
      ? await updateStudentProductAction(product.id, studentId, payload)
      : await createStudentProductAction(studentId, payload);
    setSaving(false);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success(product ? "Produto actualizado" : "Produto criado");
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          <DialogDescription>
            {product ? "Editar os detalhes deste produto." : "Preenche os dados para criar um novo produto."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Nome *</label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="mt-1" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Preço (€)</label>
              <Input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Input value={form.product_type} onChange={(e) => setForm((p) => ({ ...p, product_type: e.target.value }))} placeholder="ex: curso, mentoria" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Posição (Value Ladder)</label>
              <Input type="number" value={form.value_ladder_position} onChange={(e) => setForm((p) => ({ ...p, value_ladder_position: e.target.value }))} placeholder="1, 2, 3…" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Garantia</label>
              <Input value={form.garantia} onChange={(e) => setForm((p) => ({ ...p, garantia: e.target.value }))} placeholder="ex: 7 dias" className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "A guardar…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  studentId: string;
  isCoach?: boolean;
}

export function StudentLaunches({ studentId, isCoach = false }: Props) {
  const [launches, setLaunches]     = useState<StudentLaunch[]>([]);
  const [products, setProducts]     = useState<StudentProduct[]>([]);
  const [debriefs, setDebriefs]     = useState<Record<string, StudentLaunchDebrief>>({});
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<Record<string, "planeamento" | "metas" | "debrief">>({});

  // Dialogs
  const [wizard, setWizard]                 = useState<{ open: boolean; launch: StudentLaunch | null }>({ open: false, launch: null });
  const [showProducts, setShowProducts]     = useState(false);
  const [productDialog, setProductDialog]   = useState<{ open: boolean; product: StudentProduct | null }>({ open: false, product: null });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Saving states
  const [savingLaunch, setSavingLaunch]     = useState<string | null>(null);
  const [savingDebrief, setSavingDebrief]   = useState<string | null>(null);
  const [requestingDelete, setRequestingDelete] = useState<string | null>(null);
  const [deleting, setDeleting]             = useState<string | null>(null);
  const [duplicating, setDuplicating]       = useState<string | null>(null);
  const [reviewingLaunch, setReviewingLaunch] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes]       = useState<Record<string, string>>({});

  // Form state for each launch (planning section)
  const [planForms, setPlanForms] = useState<Record<string, Partial<StudentLaunch>>>({});
  // Debrief raw inputs (including the "absolute" lead/ref inputs that aren't persisted)
  const [debriefForms, setDebriefForms] = useState<Record<string, Partial<StudentLaunchDebrief> & {
    leads_pagas_abs: string;
    leads_organicas_abs: string;
    referencias_pagas_abs: string;
  }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [launchData, productData] = await Promise.all([
      getStudentLaunchesAction(studentId),
      getStudentProductsAction(studentId),
    ]);
    setLaunches(launchData);
    setProducts(productData);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  // When a launch is expanded for the first time, load its debrief
  useEffect(() => {
    if (!expandedId) return;
    if (debriefs[expandedId] !== undefined) return;
    getLaunchDebriefAction(expandedId).then((d) => {
      setDebriefs((prev) => ({ ...prev, [expandedId]: d ?? ({} as StudentLaunchDebrief) }));
    });
  }, [expandedId]);

  // Init plan forms
  useEffect(() => {
    setPlanForms((prev) => {
      const next: Record<string, Partial<StudentLaunch>> = {};
      for (const l of launches) {
        next[l.id] = prev[l.id] ?? { ...l };
      }
      return next;
    });
  }, [launches]);

  // Init debrief forms when debrief data arrives
  useEffect(() => {
    setDebriefForms((prev) => {
      const next = { ...prev };
      for (const [launchId, d] of Object.entries(debriefs)) {
        if (!next[launchId]) {
          next[launchId] = {
            ...d,
            leads_pagas_abs: "",
            leads_organicas_abs: "",
            referencias_pagas_abs: "",
          };
        }
      }
      return next;
    });
  }, [debriefs]);

  function setPlan(id: string, patch: Partial<StudentLaunch>) {
    setPlanForms((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  }

  function setDebrief(id: string, patch: Partial<typeof debriefForms[string]>) {
    setDebriefForms((p) => ({ ...p, [id]: { ...p[id], ...patch } as typeof debriefForms[string] }));
  }

  function getTab(id: string): "planeamento" | "metas" | "debrief" {
    return activeTab[id] ?? "planeamento";
  }

  async function handleSavePlan(launch: StudentLaunch) {
    const form = planForms[launch.id];
    if (!form) return;
    setSavingLaunch(launch.id);
    const result = await updateStudentLaunchAction(launch.id, studentId, {
      title: form.title ?? launch.title,
      type: form.type ?? null,
      status: form.status ?? launch.status,
      goal: form.goal ?? null,
      notes: form.notes ?? null,
      channels: form.channels ?? [],
      promise: form.promise ?? null,
      sub_promise: form.sub_promise ?? null,
      main_product_id: form.main_product_id ?? null,
      downsell_product_id: form.downsell_product_id ?? null,
      upsell_product_id: form.upsell_product_id ?? null,
      ticket: form.ticket ?? null,
      start_date: form.start_date ?? null,
      end_date: form.end_date ?? null,
      capture_start_date: form.capture_start_date ?? null,
      launch_date: form.launch_date ?? null,
      cart_open_date: form.cart_open_date ?? null,
      cart_close_date: form.cart_close_date ?? null,
      downsell_start_date: form.downsell_start_date ?? null,
      downsell_end_date: form.downsell_end_date ?? null,
      budget_distribuicao: form.budget_distribuicao ?? null,
      budget_captacao: form.budget_captacao ?? null,
      budget_antecipacao: form.budget_antecipacao ?? null,
      budget_remarketing: form.budget_remarketing ?? null,
      lead_goal_1_paid: form.lead_goal_1_paid ?? null,
      lead_goal_2_paid: form.lead_goal_2_paid ?? null,
      lead_goal_3_paid: form.lead_goal_3_paid ?? null,
      lead_goal_1_organic: form.lead_goal_1_organic ?? null,
      lead_goal_2_organic: form.lead_goal_2_organic ?? null,
      lead_goal_3_organic: form.lead_goal_3_organic ?? null,
      conversion_rate_leads: form.conversion_rate_leads ?? null,
      sales_break_even_count: form.sales_break_even_count ?? null,
      sales_break_even_revenue: form.sales_break_even_revenue ?? null,
      sales_goal_1_count: form.sales_goal_1_count ?? null,
      sales_goal_1_revenue: form.sales_goal_1_revenue ?? null,
      sales_goal_2_count: form.sales_goal_2_count ?? null,
      sales_goal_2_revenue: form.sales_goal_2_revenue ?? null,
      sales_goal_3_count: form.sales_goal_3_count ?? null,
      sales_goal_3_revenue: form.sales_goal_3_revenue ?? null,
      completed_at:
        form.status === "concluido" && !launch.completed_at
          ? new Date().toISOString()
          : launch.completed_at ?? null,
    });
    setSavingLaunch(null);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Lançamento guardado");
    await load();
  }

  async function handleSaveDebrief(launch: StudentLaunch) {
    const form = debriefForms[launch.id];
    if (!form) return;
    setSavingDebrief(launch.id);

    // Calculate persisted pct fields from absolute inputs
    const leadsTotal = form.leads_totais ? Number(form.leads_totais) : null;
    const refTotal   = form.referencias_geradas ? Number(form.referencias_geradas) : null;

    const leads_pagas_pct =
      leadsTotal && form.leads_pagas_abs
        ? Number(form.leads_pagas_abs) / leadsTotal
        : (form.leads_pagas_pct ?? null);

    const leads_organicas_pct =
      leadsTotal && form.leads_organicas_abs
        ? Number(form.leads_organicas_abs) / leadsTotal
        : (form.leads_organicas_pct ?? null);

    const referencias_pagas_pct =
      refTotal && form.referencias_pagas_abs
        ? Number(form.referencias_pagas_abs) / refTotal
        : (form.referencias_pagas_pct ?? null);

    const result = await upsertLaunchDebriefAction(launch.id, studentId, {
      investimento_total:        Number(form.investimento_total ?? 0),
      investimento_distribuicao: Number(form.investimento_distribuicao ?? 0),
      investimento_captacao:     Number(form.investimento_captacao ?? 0),
      investimento_antecipacao:  Number(form.investimento_antecipacao ?? 0),
      investimento_remarketing:  Number(form.investimento_remarketing ?? 0),
      visitantes_pagina:         form.visitantes_pagina ? Number(form.visitantes_pagina) : null,
      leads_totais:              leadsTotal,
      leads_pagas_pct,
      leads_organicas_pct,
      leads_publico_quente:      form.leads_publico_quente ? Number(form.leads_publico_quente) : null,
      leads_publico_frio:        form.leads_publico_frio ? Number(form.leads_publico_frio) : null,
      leads_wpp:                 form.leads_wpp ? Number(form.leads_wpp) : null,
      ao_vivo_maximo:            form.ao_vivo_maximo ? Number(form.ao_vivo_maximo) : null,
      ao_vivo_estavel:           form.ao_vivo_estavel ? Number(form.ao_vivo_estavel) : null,
      ao_vivo_pitch:             form.ao_vivo_pitch ? Number(form.ao_vivo_pitch) : null,
      visualizacoes:             form.visualizacoes ? Number(form.visualizacoes) : null,
      melhor_video:              form.melhor_video ?? null,
      melhor_carrossel:          form.melhor_carrossel ?? null,
      melhor_estatico:           form.melhor_estatico ?? null,
      criativos_anexos:          form.criativos_anexos ?? [],
      views_lpv:                 form.views_lpv ? Number(form.views_lpv) : null,
      views_checkout:            form.views_checkout ? Number(form.views_checkout) : null,
      total_vendas:              form.total_vendas ? Number(form.total_vendas) : null,
      vendas_dia_evento:         form.vendas_dia_evento ? Number(form.vendas_dia_evento) : null,
      vendas_workshop:           form.vendas_workshop ? Number(form.vendas_workshop) : null,
      receita_liquida_fase_venda: form.receita_liquida_fase_venda ? Number(form.receita_liquida_fase_venda) : null,
      referencias_geradas:       refTotal,
      referencias_pagas_pct,
      downsell_vendas:           form.downsell_vendas ? Number(form.downsell_vendas) : null,
      downsell_receita_bruta:    form.downsell_receita_bruta ? Number(form.downsell_receita_bruta) : null,
      downsell_receita_liquida:  form.downsell_receita_liquida ? Number(form.downsell_receita_liquida) : null,
      observacoes:               form.observacoes ?? null,
    });
    setSavingDebrief(null);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Debriefing guardado");
    // Refresh debrief
    setDebriefs((prev) => ({ ...prev, [launch.id]: (result as any).data }));
  }

  async function handleReview(launchId: string, status: ReviewStatus) {
    setReviewingLaunch(launchId);
    const notes = reviewNotes[launchId] ?? null;
    const result = await updateLaunchReviewStatusAction(launchId, studentId, status, notes);
    setReviewingLaunch(null);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success(status === "aprovado" ? "Lançamento aprovado" : "Alterações pedidas");
    await load();
  }

  async function handleDuplicate(launchId: string) {
    setDuplicating(launchId);
    const result = await duplicateLaunchAction(launchId, studentId);
    setDuplicating(null);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Lançamento duplicado");
    await load();
    const newId = (result as { data: StudentLaunch }).data?.id;
    if (newId) setExpandedId(newId);
  }

  async function handleRequestDelete(launchId: string) {
    setRequestingDelete(launchId);
    const result = await requestLaunchDeletionAction(launchId);
    setRequestingDelete(null);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Pedido de exclusão enviado. O coach será notificado.");
    await load();
  }

  async function handleDelete(launchId: string) {
    setDeleting(launchId);
    const result = await deleteLaunchAction(launchId, studentId);
    setDeleting(null);
    setConfirmDeleteId(null);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Lançamento eliminado");
    await load();
  }

  async function handleCancelDeletion(launchId: string) {
    const result = await cancelLaunchDeletionRequestAction(launchId, studentId);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Pedido cancelado");
    await load();
  }

  const pendingDeletions = launches.filter((l) => l.deletion_requested_at);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Lançamentos</CardTitle>
          {launches.length > 0 && (
            <Badge className="rounded-full border border-zinc-200 bg-zinc-100 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {launches.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowProducts(true)}>
            <Package className="mr-1 size-3" />
            Produtos
          </Button>
          <Button size="sm" onClick={() => setWizard({ open: true, launch: null })}>
            <Plus className="mr-1 size-3" />
            Novo Briefing de Lançamento
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Alertas de exclusão pendente — só visível ao coach */}
        {isCoach && pendingDeletions.length > 0 && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
              <AlertTriangle className="size-3.5" />
              {pendingDeletions.length} pedido{pendingDeletions.length > 1 ? "s" : ""} de exclusão pendente{pendingDeletions.length > 1 ? "s" : ""}
            </p>
            {pendingDeletions.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-amber-900 dark:text-amber-300">{l.title}</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 text-xs"
                    disabled={deleting === l.id}
                    onClick={() => setConfirmDeleteId(l.id)}
                  >
                    Apagar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => handleCancelDeletion(l.id)}
                  >
                    Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && <p className="text-sm text-muted-foreground">A carregar…</p>}

        {!loading && launches.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum lançamento registado.</p>
        )}

        {!loading && launches.map((launch) => {
          const isExpanded = expandedId === launch.id;
          const tab = getTab(launch.id);
          const plan = planForms[launch.id] ?? launch;
          const debrief = debriefs[launch.id] ?? null;
          const debriefForm = debriefForms[launch.id];
          const calc = debrief && Object.keys(debrief).length > 0
            ? calcDebrief(debrief as StudentLaunchDebrief, launch.ticket)
            : null;
          const isSavingPlan    = savingLaunch === launch.id;
          const isSavingDebrief = savingDebrief === launch.id;

          return (
            <div key={launch.id} className="rounded border bg-card">
              {/* Card row */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId((prev) => (prev === launch.id ? null : launch.id))}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedId((prev) => (prev === launch.id ? null : launch.id)); } }}
                className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-muted/40 cursor-pointer"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{launch.title}</span>
                    <LaunchStatusBadge status={launch.status} />
                    <LaunchPhaseBadge phase={calcLaunchPhase(launch)} />
                    <SectionStatusBadge status={launch.review_status} />
                    {launch.type && (
                      <span className="text-xs text-muted-foreground capitalize">{launch.type}</span>
                    )}
                    {launch.deletion_requested_at && (
                      <Badge className="rounded-full border border-amber-300 bg-amber-100 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Exclusão pendente
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {launch.launch_date && (
                      <span>Dia D: {new Date(launch.launch_date + "T00:00:00").toLocaleDateString("pt-PT")}</span>
                    )}
                    {calc?.receita_liquida_total != null && (
                      <span className="font-medium text-foreground">
                        {fmtEur(calc.receita_liquida_total)} líquido
                        {calc.roas_total != null && ` · ROAS ${calc.roas_total.toFixed(1)}x`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 mt-0.5">
                  {/* Wizard edit */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setWizard({ open: true, launch }); }}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    title="Editar configuração"
                  >
                    <Settings2 className="size-3.5" />
                  </button>
                  {/* Duplicate */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDuplicate(launch.id); }}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    title="Duplicar"
                    disabled={duplicating === launch.id}
                  >
                    <Copy className="size-3.5" />
                  </button>
                  {/* Delete button */}
                  {isCoach ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(launch.id); }}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : launch.deletion_requested_at ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Aguarda aprovação</span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRequestDelete(launch.id); }}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      disabled={requestingDelete === launch.id}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                  {isExpanded
                    ? <ChevronDown className="size-4 text-muted-foreground" />
                    : <ChevronRight className="size-4 text-muted-foreground" />
                  }
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t">
                  {/* Coach review panel */}
                  {isCoach && (() => {
                    const coachOptions = COACH_TRANSITIONS[launch.review_status as ReviewStatus] ?? [];
                    if (coachOptions.length === 0) return null;
                    return (
                      <div className="border-b bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs font-medium text-muted-foreground">Revisão:</span>
                          {coachOptions.map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant={s === "aprovado" ? "default" : "outline"}
                              className="h-7 text-xs"
                              disabled={reviewingLaunch === launch.id}
                              onClick={() => handleReview(launch.id, s as ReviewStatus)}
                            >
                              {s === "aprovado" ? "Aprovar" : s === "alteracoes_pedidas" ? "Pedir Alterações" : s}
                            </Button>
                          ))}
                          {coachOptions.includes("alteracoes_pedidas" as ReviewStatus) && (
                            <input
                              className="h-7 flex-1 min-w-[160px] rounded border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              placeholder="Nota para o aluno (opcional)…"
                              value={reviewNotes[launch.id] ?? ""}
                              onChange={(e) => setReviewNotes((p) => ({ ...p, [launch.id]: e.target.value }))}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tabs */}
                  <div className="flex border-b">
                    {(["planeamento", "metas", "debrief"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveTab((p) => ({ ...p, [launch.id]: t }))}
                        className={`px-4 py-2 text-xs font-medium transition-colors ${
                          tab === t
                            ? "border-b-2 border-foreground text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t === "planeamento" ? "Planeamento" : t === "metas" ? "Metas" : "Debriefing"}
                      </button>
                    ))}
                  </div>

                  <div className="bg-muted/20 p-4 space-y-6">
                    {tab === "planeamento" && launch.product_snapshot && (
                      <div className="rounded border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        Produto no momento do briefing:{" "}
                        <span className="font-medium text-foreground">
                          {String((launch.product_snapshot as Record<string, unknown>).name ?? "—")}
                          {(launch.product_snapshot as Record<string, unknown>).price != null
                            ? ` — ${(launch.product_snapshot as Record<string, unknown>).price}€`
                            : ""}
                        </span>
                        . O produto base pode ter sido atualizado desde então.
                      </div>
                    )}
                    {tab === "planeamento" && (
                      <PlanningForm
                        launch={launch}
                        form={plan as StudentLaunch}
                        products={products}
                        setPlan={(patch) => setPlan(launch.id, patch)}
                        onSave={() => handleSavePlan(launch)}
                        saving={isSavingPlan}
                      />
                    )}

                    {tab === "metas" && (
                      <LaunchGoalsCalculator
                        launch={plan as StudentLaunch}
                        debrief={debrief && Object.keys(debrief).length > 0 ? debrief as StudentLaunchDebrief : null}
                        studentId={studentId}
                      />
                    )}

                    {tab === "debrief" && (
                      <DebriefForm
                        launch={launch}
                        form={debriefForm}
                        calc={calc}
                        setDebrief={(patch) => setDebrief(launch.id, patch)}
                        onSave={() => handleSaveDebrief(launch)}
                        saving={isSavingDebrief}
                        planBudget={{
                          distribuicao: launch.budget_distribuicao,
                          captacao: launch.budget_captacao,
                          antecipacao: launch.budget_antecipacao,
                          remarketing: launch.budget_remarketing,
                          total: calcBudgetTotal(launch),
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <LaunchWizard
        open={wizard.open}
        launch={wizard.launch}
        studentId={studentId}
        products={products}
        isCoach={isCoach}
        onClose={() => setWizard({ open: false, launch: null })}
        onSaved={async (saved) => {
          await load();
          setExpandedId(saved.id);
        }}
      />

      {/* Dialog: confirmar eliminação (coach) */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar lançamento</DialogTitle>
            <DialogDescription>
              Esta acção é irreversível. Todos os dados de planeamento e debriefing serão apagados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleting === confirmDeleteId}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              {deleting === confirmDeleteId ? "A eliminar…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: gerir produtos */}
      <Dialog open={showProducts} onOpenChange={setShowProducts}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Produtos do Aluno</DialogTitle>
            <DialogDescription>Gere os produtos associados a este aluno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {products.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum produto criado ainda.</p>
            )}
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.product_type && `${p.product_type} · `}
                    {p.price != null ? fmtEur(p.price) : "Sem preço"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => setProductDialog({ open: true, product: p })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={async () => {
                      const r = await deleteStudentProductAction(p.id, studentId);
                      if ("error" in r) { toast.error(r.error); return; }
                      toast.success("Produto eliminado");
                      await load();
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setProductDialog({ open: true, product: null })}>
              <Plus className="mr-1 size-3" />
              Novo Produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductDialog
        studentId={studentId}
        product={productDialog.product}
        open={productDialog.open}
        onClose={() => setProductDialog({ open: false, product: null })}
        onSaved={load}
      />
    </Card>
  );
}

// ── Planning Form ─────────────────────────────────────────────────────────────

interface PlanningFormProps {
  launch: StudentLaunch;
  form: StudentLaunch;
  products: StudentProduct[];
  setPlan: (patch: Partial<StudentLaunch>) => void;
  onSave: () => void;
  saving: boolean;
}

function PlanningForm({ launch, form, products, setPlan, onSave, saving }: PlanningFormProps) {
  const n = (key: keyof StudentLaunch) => form[key]?.toString() ?? "";
  const setN = (key: keyof StudentLaunch) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPlan({ [key]: e.target.value ? Number(e.target.value) : null });
  const setT = (key: keyof StudentLaunch) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setPlan({ [key]: e.target.value || null });
  const setD = (key: keyof StudentLaunch) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPlan({ [key]: e.target.value || null });

  const totalBudgetPlanned =
    (form.budget_distribuicao ?? 0) +
    (form.budget_captacao ?? 0) +
    (form.budget_antecipacao ?? 0) +
    (form.budget_remarketing ?? 0) || null;

  function toggleChannel(ch: string) {
    const curr = form.channels ?? [];
    setPlan({ channels: curr.includes(ch) ? curr.filter((c) => c !== ch) : [...curr, ch] });
  }

  function productOpts() {
    return [
      <SelectItem key="none" value="none">— Nenhum —</SelectItem>,
      ...products.map((p) => (
        <SelectItem key={p.id} value={p.id}>
          {p.name}{p.price != null ? ` · ${fmtEur(p.price)}` : ""}
        </SelectItem>
      )),
    ];
  }

  return (
    <div className="space-y-6">
      {/* Dados gerais */}
      <section className="space-y-3">
        <SectionTitle>Dados Gerais</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-medium">Título</label>
            <Input value={form.title} onChange={(e) => setPlan({ title: e.target.value })} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Tipo</label>
            <Select
              value={form.type ?? "none"}
              onValueChange={(v) => setPlan({ type: v === "none" ? null : v })}
            >
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {LAUNCH_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Status</label>
            <Select
              value={form.status}
              onValueChange={(v) => setPlan({ status: v as LaunchStatus })}
            >
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as LaunchStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium">Objetivo</label>
            <Textarea value={form.goal ?? ""} onChange={setT("goal")} className="mt-1 text-sm" rows={2} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium">Promessa principal</label>
            <Input value={form.promise ?? ""} onChange={setT("promise") as any} className="mt-1 h-8 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium">Sub-promessa</label>
            <Input value={form.sub_promise ?? ""} onChange={setT("sub_promise") as any} className="mt-1 h-8 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium">Canais</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {CHANNELS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    (form.channels ?? []).includes(ch)
                      ? "border-foreground bg-foreground text-background"
                      : "border-input bg-background text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium">Notas</label>
            <Textarea value={form.notes ?? ""} onChange={setT("notes")} className="mt-1 text-sm" rows={2} />
          </div>
        </div>
      </section>

      {/* Produto */}
      <section className="space-y-3">
        <SectionTitle>Produtos</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Produto principal</label>
            <Select
              value={form.main_product_id ?? "none"}
              onValueChange={(v) => {
                const pid = v === "none" ? null : v;
                const product = products.find((p) => p.id === pid);
                setPlan({ main_product_id: pid, ticket: product?.price ?? form.ticket ?? null });
              }}
            >
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{productOpts()}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Ticket (€) — copiado do produto</label>
            <Input type="number" value={n("ticket")} onChange={setN("ticket")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Produto downsell</label>
            <Select
              value={form.downsell_product_id ?? "none"}
              onValueChange={(v) => setPlan({ downsell_product_id: v === "none" ? null : v })}
            >
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{productOpts()}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Produto upsell</label>
            <Select
              value={form.upsell_product_id ?? "none"}
              onValueChange={(v) => setPlan({ upsell_product_id: v === "none" ? null : v })}
            >
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{productOpts()}</SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Datas */}
      <section className="space-y-3">
        <SectionTitle>Calendário</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {([
            ["start_date", "Início de captação"],
            ["capture_start_date", "Abertura de lista"],
            ["launch_date", "Dia D"],
            ["cart_open_date", "Abertura de carrinho"],
            ["cart_close_date", "Fecho de carrinho"],
            ["downsell_start_date", "Início downsell"],
            ["downsell_end_date", "Fim downsell"],
            ["end_date", "Fim geral"],
          ] as [keyof StudentLaunch, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="text-xs font-medium">{label}</label>
              <Input type="date" value={n(key)} onChange={setD(key)} className="mt-1 h-8 text-sm" />
            </div>
          ))}
        </div>
      </section>

      {/* Orçamentos */}
      <section className="space-y-3">
        <SectionTitle>Orçamento Planeado</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["budget_distribuicao", "Distribuição"],
            ["budget_captacao", "Captação"],
            ["budget_antecipacao", "Antecipação"],
            ["budget_remarketing", "Remarketing"],
          ] as [keyof StudentLaunch, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="text-xs font-medium">{label} (€)</label>
              <Input type="number" value={n(key)} onChange={setN(key)} className="mt-1 h-8 text-sm" />
            </div>
          ))}
          {totalBudgetPlanned != null && (
            <div className="sm:col-span-2 rounded bg-muted/40 px-3 py-2 text-xs">
              Total planeado: <span className="font-semibold">{fmtEur(totalBudgetPlanned)}</span>
            </div>
          )}
        </div>
      </section>

      {/* Metas de leads */}
      <section className="space-y-3">
        <SectionTitle>Metas de Leads</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {([
            ["lead_goal_1_paid", "Meta 1 – Pagas"],
            ["lead_goal_2_paid", "Meta 2 – Pagas"],
            ["lead_goal_3_paid", "Meta 3 – Pagas"],
            ["lead_goal_1_organic", "Meta 1 – Orgânicas"],
            ["lead_goal_2_organic", "Meta 2 – Orgânicas"],
            ["lead_goal_3_organic", "Meta 3 – Orgânicas"],
          ] as [keyof StudentLaunch, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="text-xs font-medium">{label}</label>
              <Input type="number" value={n(key)} onChange={setN(key)} className="mt-1 h-8 text-sm" />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium">Taxa conv. leads esperada (%)</label>
            <Input type="number" step="0.01" value={n("conversion_rate_leads")} onChange={setN("conversion_rate_leads")} className="mt-1 h-8 text-sm" />
          </div>
        </div>
      </section>

      {/* Metas de vendas */}
      <section className="space-y-3">
        <SectionTitle>Metas de Vendas</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["sales_break_even_count", "Break-even – Unidades"],
            ["sales_break_even_revenue", "Break-even – Receita (€)"],
            ["sales_goal_1_count", "Meta 1 – Unidades"],
            ["sales_goal_1_revenue", "Meta 1 – Receita (€)"],
            ["sales_goal_2_count", "Meta 2 – Unidades"],
            ["sales_goal_2_revenue", "Meta 2 – Receita (€)"],
            ["sales_goal_3_count", "Meta 3 – Unidades"],
            ["sales_goal_3_revenue", "Meta 3 – Receita (€)"],
          ] as [keyof StudentLaunch, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="text-xs font-medium">{label}</label>
              <Input type="number" value={n(key)} onChange={setN(key)} className="mt-1 h-8 text-sm" />
            </div>
          ))}
        </div>
      </section>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "A guardar…" : "Guardar planeamento"}
        </Button>
      </div>
    </div>
  );
}

// ── Debrief Form ──────────────────────────────────────────────────────────────

interface PlanBudget {
  distribuicao: number | null;
  captacao: number | null;
  antecipacao: number | null;
  remarketing: number | null;
  total: number | null;
}

interface DebriefFormProps {
  launch: StudentLaunch;
  form: (Partial<StudentLaunchDebrief> & { leads_pagas_abs: string; leads_organicas_abs: string; referencias_pagas_abs: string }) | undefined;
  calc: ReturnType<typeof calcDebrief> | null;
  setDebrief: (patch: Partial<NonNullable<DebriefFormProps["form"]>>) => void;
  onSave: () => void;
  saving: boolean;
  planBudget: PlanBudget;
}

function DebriefForm({ launch, form, calc, setDebrief, onSave, saving, planBudget }: DebriefFormProps) {
  if (!form) {
    return <p className="text-sm text-muted-foreground">A carregar debriefing…</p>;
  }

  const n = (key: keyof StudentLaunchDebrief) => form[key]?.toString() ?? "";
  const setN = (key: keyof StudentLaunchDebrief) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDebrief({ [key]: e.target.value !== "" ? Number(e.target.value) : null } as any);
  const setT = (key: keyof StudentLaunchDebrief) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDebrief({ [key]: e.target.value || null } as any);

  return (
    <div className="space-y-6">
      {launch.status !== "concluido" && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          Estás a preencher o debriefing antes de o lançamento terminar. Os valores finais podem ser atualizados depois.
        </div>
      )}
      {/* Investimento */}
      <section className="space-y-3">
        <SectionTitle>Investimento Real</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["investimento_distribuicao", "Distribuição", planBudget.distribuicao],
            ["investimento_captacao",     "Captação",     planBudget.captacao],
            ["investimento_antecipacao",  "Antecipação",  planBudget.antecipacao],
            ["investimento_remarketing",  "Remarketing",  planBudget.remarketing],
          ] as [keyof StudentLaunchDebrief, string, number | null][]).map(([key, label, planned]) => (
            <div key={key}>
              <label className="text-xs font-medium">{label} (€){planned != null && <span className="text-muted-foreground font-normal"> · Plan: {fmtEur(planned)}</span>}</label>
              <Input type="number" value={n(key)} onChange={setN(key)} className="mt-1 h-8 text-sm" />
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Investimento total (€){planBudget.total != null && <span className="text-muted-foreground font-normal"> · Plan: {fmtEur(planBudget.total)}</span>}</label>
            <Input type="number" value={n("investimento_total")} onChange={setN("investimento_total")} className="mt-1 h-8 text-sm" />
          </div>
          <CalcField label="CPL (calculado)" value={fmtEur(calc?.cpl)} tooltip="Custo Por Lead — quanto custou, em média, cada inscrição. Calculado automaticamente: investimento total ÷ leads totais." />
        </div>
      </section>

      {/* Leads */}
      <section className="space-y-3">
        <SectionTitle>Leads</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium flex items-center gap-1">
              Visitantes página
              <InfoTooltip text="Total de pessoas que abriram a tua página de inscrição (landing page)." />
            </label>
            <Input type="number" value={n("visitantes_pagina")} onChange={setN("visitantes_pagina")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Leads totais</label>
            <Input type="number" value={n("leads_totais")} onChange={setN("leads_totais")} className="mt-1 h-8 text-sm" />
          </div>
          <CalcField label="Taxa conv. LP (calculado)" value={fmtPct(calc?.taxa_conversao_lp)} />
          <div>
            <label className="text-xs font-medium">Leads pagas (nº absoluto)</label>
            <Input type="number" value={form.leads_pagas_abs} onChange={(e) => setDebrief({ leads_pagas_abs: e.target.value } as any)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Leads orgânicas (nº absoluto)</label>
            <Input type="number" value={form.leads_organicas_abs} onChange={(e) => setDebrief({ leads_organicas_abs: e.target.value } as any)} className="mt-1 h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CalcField label="% pagas (guardado)" value={fmtPct(form.leads_pagas_pct)} />
            <CalcField label="% orgânicas (guardado)" value={fmtPct(form.leads_organicas_pct)} />
          </div>
          <div>
            <label className="text-xs font-medium">Leads público quente</label>
            <Input type="number" value={n("leads_publico_quente")} onChange={setN("leads_publico_quente")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Leads público frio</label>
            <Input type="number" value={n("leads_publico_frio")} onChange={setN("leads_publico_frio")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Leads WhatsApp</label>
            <Input type="number" value={n("leads_wpp")} onChange={setN("leads_wpp")} className="mt-1 h-8 text-sm" />
          </div>
          <CalcField label="Taxa lead→WPP (calculado)" value={fmtPct(calc?.taxa_conv_lead_wpp)} />
        </div>
      </section>

      {/* Ao vivo */}
      <section className="space-y-3">
        <SectionTitle>Ao Vivo</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium">Máximo ao vivo</label>
            <Input type="number" value={n("ao_vivo_maximo")} onChange={setN("ao_vivo_maximo")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Ao vivo estável</label>
            <Input type="number" value={n("ao_vivo_estavel")} onChange={setN("ao_vivo_estavel")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Ao vivo no pitch</label>
            <Input type="number" value={n("ao_vivo_pitch")} onChange={setN("ao_vivo_pitch")} className="mt-1 h-8 text-sm" />
          </div>
          <CalcField label="Taxa comparecimento total" value={fmtPct(calc?.taxa_comparecimento_total)} />
          <CalcField label="Taxa comparecimento WPP" value={fmtPct(calc?.taxa_comparecimento_wpp)} />
          <div>
            <label className="text-xs font-medium">Visualizações</label>
            <Input type="number" value={n("visualizacoes")} onChange={setN("visualizacoes")} className="mt-1 h-8 text-sm" />
          </div>
        </div>
      </section>

      {/* Criativos */}
      <section className="space-y-3">
        <SectionTitle>Criativos</SectionTitle>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium">Melhor vídeo</label>
            <Input value={n("melhor_video")} onChange={setT("melhor_video") as any} className="mt-1 h-8 text-sm" placeholder="URL ou descrição" />
          </div>
          <div>
            <label className="text-xs font-medium">Melhor carrossel</label>
            <Input value={n("melhor_carrossel")} onChange={setT("melhor_carrossel") as any} className="mt-1 h-8 text-sm" placeholder="URL ou descrição" />
          </div>
          <div>
            <label className="text-xs font-medium">Melhor estático</label>
            <Input value={n("melhor_estatico")} onChange={setT("melhor_estatico") as any} className="mt-1 h-8 text-sm" placeholder="URL ou descrição" />
          </div>
        </div>
      </section>

      {/* LPV / Checkout */}
      <section className="space-y-3">
        <SectionTitle>LPV e Checkout</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="text-xs font-medium flex items-center gap-1">
              Views LPV
              <InfoTooltip text="Visualizações da Página de Vendas — quantas pessoas viram a página onde o produto é apresentado e vendido." />
            </label>
            <Input type="number" value={n("views_lpv")} onChange={setN("views_lpv")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Views Checkout</label>
            <Input type="number" value={n("views_checkout")} onChange={setN("views_checkout")} className="mt-1 h-8 text-sm" />
          </div>
          <CalcField label="Conv. LPV" value={fmtPct(calc?.taxa_conversao_lpv)} />
          <CalcField label="Conv. Checkout" value={fmtPct(calc?.taxa_conversao_checkout)} />
        </div>
      </section>

      {/* Vendas */}
      <section className="space-y-3">
        <SectionTitle>Vendas (Fase Principal)</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium">Total de vendas</label>
            <Input type="number" value={n("total_vendas")} onChange={setN("total_vendas")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Vendas dia do evento</label>
            <Input type="number" value={n("vendas_dia_evento")} onChange={setN("vendas_dia_evento")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Vendas workshop</label>
            <Input type="number" value={n("vendas_workshop")} onChange={setN("vendas_workshop")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Receita líquida (fase venda) (€)</label>
            <Input type="number" value={n("receita_liquida_fase_venda")} onChange={setN("receita_liquida_fase_venda")} className="mt-1 h-8 text-sm" />
          </div>
          <CalcField label="Conv. leads→venda" value={fmtPct(calc?.taxa_conversao_leads)} />
          <CalcField label="Conv. ao vivo→venda" value={fmtPct(calc?.taxa_conversao_ao_vivo)} tooltip="De todas as pessoas que estiveram ao vivo no pitch, quantas compraram. Calculado: vendas ÷ ao vivo no pitch." />
          <CalcField label={`ROAS (fase venda)${planBudget.total ? ` · Plan inv: ${fmtEur(planBudget.total)}` : ""}`} value={calc?.roas != null ? `${calc.roas.toFixed(2)}x` : "—"} tooltip="Return On Ad Spend — quantas vezes recuperaste o investimento em publicidade. Ex: 3x significa €3 gerados por cada €1 investido." />
        </div>
      </section>

      {/* Referências */}
      <section className="space-y-3">
        <SectionTitle>Referências</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium">Referências geradas</label>
            <Input type="number" value={n("referencias_geradas")} onChange={setN("referencias_geradas")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Referências pagas (nº absoluto)</label>
            <Input type="number" value={form.referencias_pagas_abs} onChange={(e) => setDebrief({ referencias_pagas_abs: e.target.value } as any)} className="mt-1 h-8 text-sm" />
          </div>
          <CalcField label="% referências pagas (guardado)" value={fmtPct(form.referencias_pagas_pct)} />
        </div>
      </section>

      {/* Downsell */}
      <section className="space-y-3">
        <SectionTitle>Downsell</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium">Vendas downsell</label>
            <Input type="number" value={n("downsell_vendas")} onChange={setN("downsell_vendas")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Receita bruta downsell (€)</label>
            <Input type="number" value={n("downsell_receita_bruta")} onChange={setN("downsell_receita_bruta")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Receita líquida downsell (€)</label>
            <Input type="number" value={n("downsell_receita_liquida")} onChange={setN("downsell_receita_liquida")} className="mt-1 h-8 text-sm" />
          </div>
        </div>
      </section>

      {/* Totais calculados */}
      <section className="rounded border bg-muted/30 p-4 space-y-2">
        <SectionTitle>Totais (calculados)</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          <CalcField label="Receita bruta total" value={fmtEur(calc?.receita_bruta_total)} />
          <CalcField label="Receita líquida total" value={fmtEur(calc?.receita_liquida_total)} />
          <CalcField label="ROAS fase venda" value={calc?.roas != null ? `${calc.roas.toFixed(2)}x` : "—"} />
          <CalcField label="ROAS total" value={calc?.roas_total != null ? `${calc.roas_total.toFixed(2)}x` : "—"} />
        </div>
      </section>

      {/* Observações */}
      <section className="space-y-3">
        <SectionTitle>Observações</SectionTitle>
        <Textarea value={n("observacoes")} onChange={setT("observacoes") as any} className="text-sm" rows={3} placeholder="Notas qualitativas, o que correu bem, o que melhorar…" />
      </section>

      <div className="pt-2">
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "A guardar…" : "Guardar debriefing"}
        </Button>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Ao guardar a receita líquida num lançamento concluído, o ROI do aluno é actualizado automaticamente.
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
  );
}
