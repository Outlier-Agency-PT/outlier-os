"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Copy, Settings2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  getStudentOwnLaunchesAction,
  getLaunchDebriefAction,
  upsertLaunchDebriefAction,
} from "@/lib/actions/student-launches";
import { duplicateMyLaunchAction } from "@/lib/actions/student-launch-config";
import { getMyProductsAction } from "@/lib/actions/products";
import {
  calcDebrief,
  calcLaunchPhase,
  type StudentLaunch,
  type StudentLaunchDebrief,
  type StudentProduct,
  type LaunchStatus,
} from "@/lib/types/student-launches";
import { SectionStatusBadge } from "@/components/ui/section-status-badge";
import { LaunchWizard, LaunchPhaseBadge } from "@/components/students/launch-wizard";
import { LaunchGoalsCalculator } from "@/components/incubadora/launch-goals-calculator";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 0, suffix = "") {
  if (n == null) return "—";
  return n.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
}
function fmtEur(n: number | null | undefined) { return fmt(n, 2, "€"); }
function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return (n * 100).toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
  );
}

function CalcField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-1 flex h-8 cursor-not-allowed items-center rounded-md border border-input bg-muted/60 px-3 text-sm text-muted-foreground select-none">
        {value}
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CLASSES: Record<LaunchStatus, string> = {
  em_curso:  "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  concluido: "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelado: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  planeado:  "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const STATUS_LABELS: Record<LaunchStatus, string> = {
  em_curso:  "Em curso",
  concluido: "Concluído",
  cancelado: "Cancelado",
  planeado:  "Planeado",
};

function LaunchStatusBadge({ status }: { status: LaunchStatus }) {
  return (
    <Badge className={`rounded-full border text-[10px] ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

// ── Planeamento summary (read-only + edit button) ─────────────────────────────

function PlaneamentoTab({
  launch,
  onEdit,
}: {
  launch: StudentLaunch;
  onEdit: () => void;
}) {
  const date = (s: string | null) =>
    s ? new Date(s + "T00:00:00").toLocaleDateString("pt-PT") : "—";

  const budgetTotal =
    (launch.budget_distribuicao ?? 0) +
    (launch.budget_captacao ?? 0) +
    (launch.budget_antecipacao ?? 0) +
    (launch.budget_remarketing ?? 0) || null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionTitle>Configuração do lançamento</SectionTitle>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Settings2 className="mr-1 size-3" />
          Editar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Dados gerais */}
        <div className="space-y-3">
          <SectionTitle>Geral</SectionTitle>
          <dl className="space-y-1.5 text-sm">
            <Row label="Título" value={launch.title} />
            <Row label="Tipo" value={launch.type ?? "—"} />
            <Row label="Status" value={STATUS_LABELS[launch.status]} />
            {launch.promise && <Row label="Promessa" value={launch.promise} />}
            {launch.sub_promise && <Row label="Sub-promessa" value={launch.sub_promise} />}
            {launch.channels?.length > 0 && (
              <Row label="Canais" value={launch.channels.join(", ")} />
            )}
            {launch.goal && <Row label="Objetivo" value={launch.goal} />}
          </dl>
        </div>

        {/* Calendário */}
        <div className="space-y-3">
          <SectionTitle>Calendário</SectionTitle>
          <dl className="space-y-1.5 text-sm">
            {launch.start_date && <Row label="Início captação" value={date(launch.start_date)} />}
            {launch.capture_start_date && <Row label="Abertura lista" value={date(launch.capture_start_date)} />}
            {launch.launch_date && <Row label="Dia D" value={date(launch.launch_date)} />}
            {launch.cart_open_date && <Row label="Abertura carrinho" value={date(launch.cart_open_date)} />}
            {launch.cart_close_date && <Row label="Fecho carrinho" value={date(launch.cart_close_date)} />}
            {launch.downsell_start_date && <Row label="Início downsell" value={date(launch.downsell_start_date)} />}
            {launch.downsell_end_date && <Row label="Fim downsell" value={date(launch.downsell_end_date)} />}
          </dl>
        </div>

        {/* Orçamento */}
        {budgetTotal != null && (
          <div className="space-y-3 sm:col-span-2">
            <SectionTitle>Orçamento Planeado</SectionTitle>
            <div className="flex flex-wrap gap-4 text-sm">
              {launch.budget_distribuicao != null && <BudgetPill label="Distribuição" value={fmtEur(launch.budget_distribuicao)} />}
              {launch.budget_captacao != null && <BudgetPill label="Captação" value={fmtEur(launch.budget_captacao)} />}
              {launch.budget_antecipacao != null && <BudgetPill label="Antecipação" value={fmtEur(launch.budget_antecipacao)} />}
              {launch.budget_remarketing != null && <BudgetPill label="Remarketing" value={fmtEur(launch.budget_remarketing)} />}
              <BudgetPill label="Total" value={fmtEur(budgetTotal)} highlight />
            </div>
          </div>
        )}

        {/* Ticket */}
        {launch.ticket != null && (
          <div className="space-y-1">
            <SectionTitle>Ticket</SectionTitle>
            <p className="text-sm font-semibold">{fmtEur(launch.ticket)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium break-words">{value}</dd>
    </div>
  );
}

function BudgetPill({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded border px-3 py-1.5 ${highlight ? "border-foreground/20 bg-muted/60" : "border-input bg-muted/30"}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

// ── Debrief Form ──────────────────────────────────────────────────────────────

type DebriefFormState = Partial<StudentLaunchDebrief> & {
  leads_pagas_abs: string;
  leads_organicas_abs: string;
  referencias_pagas_abs: string;
};

interface DebriefFormProps {
  launch: StudentLaunch;
  form: DebriefFormState | undefined;
  calc: ReturnType<typeof calcDebrief> | null;
  setDebrief: (patch: Partial<DebriefFormState>) => void;
  onSave: () => void;
  saving: boolean;
}

function DebriefForm({ launch, form, calc, setDebrief, onSave, saving }: DebriefFormProps) {
  if (!form) {
    return <p className="text-sm text-muted-foreground">A carregar debriefing…</p>;
  }

  const n = (key: keyof StudentLaunchDebrief) => form[key]?.toString() ?? "";
  const setN = (key: keyof StudentLaunchDebrief) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDebrief({ [key]: e.target.value !== "" ? Number(e.target.value) : null } as Partial<DebriefFormState>);
  const setT = (key: keyof StudentLaunchDebrief) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDebrief({ [key]: e.target.value || null } as Partial<DebriefFormState>);

  const planBudget = {
    distribuicao: launch.budget_distribuicao,
    captacao: launch.budget_captacao,
    antecipacao: launch.budget_antecipacao,
    remarketing: launch.budget_remarketing,
    total:
      (launch.budget_distribuicao ?? 0) +
      (launch.budget_captacao ?? 0) +
      (launch.budget_antecipacao ?? 0) +
      (launch.budget_remarketing ?? 0) || null,
  };

  return (
    <div className="space-y-6">
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
            <div key={key as string}>
              <label className="text-xs font-medium">
                {label} (€)
                {planned != null && <span className="text-muted-foreground font-normal"> · Plan: {fmtEur(planned)}</span>}
              </label>
              <Input type="number" value={n(key)} onChange={setN(key)} className="mt-1 h-8 text-sm" />
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">
              Investimento total (€)
              {planBudget.total != null && <span className="text-muted-foreground font-normal"> · Plan: {fmtEur(planBudget.total)}</span>}
            </label>
            <Input type="number" value={n("investimento_total")} onChange={setN("investimento_total")} className="mt-1 h-8 text-sm" />
          </div>
          <CalcField label="CPL (calculado)" value={fmtEur(calc?.cpl)} />
        </div>
      </section>

      {/* Leads */}
      <section className="space-y-3">
        <SectionTitle>Leads</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium">Visitantes página</label>
            <Input type="number" value={n("visitantes_pagina")} onChange={setN("visitantes_pagina")} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Leads totais</label>
            <Input type="number" value={n("leads_totais")} onChange={setN("leads_totais")} className="mt-1 h-8 text-sm" />
          </div>
          <CalcField label="Taxa conv. LP (calculado)" value={fmtPct(calc?.taxa_conversao_lp)} />
          <div>
            <label className="text-xs font-medium">Leads pagas (nº absoluto)</label>
            <Input type="number" value={form.leads_pagas_abs} onChange={(e) => setDebrief({ leads_pagas_abs: e.target.value })} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Leads orgânicas (nº absoluto)</label>
            <Input type="number" value={form.leads_organicas_abs} onChange={(e) => setDebrief({ leads_organicas_abs: e.target.value })} className="mt-1 h-8 text-sm" />
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
            <label className="text-xs font-medium">Views LPV</label>
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
          <CalcField label="Conv. ao vivo→venda" value={fmtPct(calc?.taxa_conversao_ao_vivo)} />
          <CalcField
            label={`ROAS (fase venda)${planBudget.total ? ` · Plan: ${fmtEur(planBudget.total)}` : ""}`}
            value={calc?.roas != null ? `${calc.roas.toFixed(2)}x` : "—"}
          />
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
            <Input type="number" value={form.referencias_pagas_abs} onChange={(e) => setDebrief({ referencias_pagas_abs: e.target.value })} className="mt-1 h-8 text-sm" />
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
        <Textarea
          value={n("observacoes")}
          onChange={setT("observacoes") as any}
          className="text-sm"
          rows={3}
          placeholder="Notas qualitativas, o que correu bem, o que melhorar…"
        />
      </section>

      <div className="pt-2">
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "A guardar…" : "Guardar debriefing"}
        </Button>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Ao guardar a receita líquida num lançamento concluído, o ROI é actualizado automaticamente.
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StudentLaunchSummary() {
  const [launches, setLaunches] = useState<StudentLaunch[]>([]);
  const [products, setProducts] = useState<StudentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState<{ open: boolean; launch: StudentLaunch | null }>({
    open: false,
    launch: null,
  });
  const [duplicating, setDuplicating] = useState<string | null>(null);

  // Accordion
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "planeamento" | "metas" | "debrief">>({});

  // Debrief data
  const [debriefs, setDebriefs] = useState<Record<string, StudentLaunchDebrief>>({});
  const [debriefForms, setDebriefForms] = useState<Record<string, DebriefFormState>>({});
  const [savingDebrief, setSavingDebrief] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [launchData, productData] = await Promise.all([
      getStudentOwnLaunchesAction(),
      getMyProductsAction(),
    ]);
    setLaunches(launchData);
    setProducts(productData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load debrief when a launch is expanded for the first time
  useEffect(() => {
    if (!expandedId) return;
    if (debriefs[expandedId] !== undefined) return;
    getLaunchDebriefAction(expandedId).then((d) => {
      const val = d ?? ({} as StudentLaunchDebrief);
      setDebriefs((prev) => ({ ...prev, [expandedId]: val }));
      setDebriefForms((prev) => ({
        ...prev,
        [expandedId]: prev[expandedId] ?? {
          ...val,
          leads_pagas_abs: "",
          leads_organicas_abs: "",
          referencias_pagas_abs: "",
        },
      }));
    });
  }, [expandedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDuplicate(launchId: string) {
    setDuplicating(launchId);
    const result = await duplicateMyLaunchAction(launchId);
    setDuplicating(null);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Lançamento duplicado");
    await load();
  }

  async function handleSaveDebrief(launch: StudentLaunch) {
    const form = debriefForms[launch.id];
    if (!form) return;
    setSavingDebrief(launch.id);

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

    const result = await upsertLaunchDebriefAction(launch.id, "", {
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
    setDebriefs((prev) => ({ ...prev, [launch.id]: (result as any).data }));
  }

  function getTab(id: string): "planeamento" | "metas" | "debrief" {
    return activeTab[id] ?? "planeamento";
  }

  function setDebriefPatch(launchId: string, patch: Partial<DebriefFormState>) {
    setDebriefForms((prev) => ({
      ...prev,
      [launchId]: { ...prev[launchId], ...patch } as DebriefFormState,
    }));
  }

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Os Meus Lançamentos</h3>
          {launches.length > 0 && (
            <Badge className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {launches.length}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setWizard({ open: true, launch: null })}
        >
          <Plus className="mr-1 size-3" />
          Novo Lançamento
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : launches.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não tens lançamentos registados.
        </p>
      ) : (
        <div className="space-y-2">
          {launches.map((launch) => {
            const isExpanded = expandedId === launch.id;
            const tab = getTab(launch.id);
            const debrief = debriefs[launch.id] ?? null;
            const debriefForm = debriefForms[launch.id];
            const calc =
              debrief && Object.keys(debrief).length > 0
                ? calcDebrief(debrief as StudentLaunchDebrief, launch.ticket)
                : null;

            const date = launch.launch_date
              ? new Date(launch.launch_date + "T00:00:00").toLocaleDateString("pt-PT", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : null;

            return (
              <div key={launch.id} className="rounded border bg-card">
                {/* Header row — clickable to expand */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setExpandedId((prev) => (prev === launch.id ? null : launch.id))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId((prev) => (prev === launch.id ? null : launch.id));
                    }
                  }}
                  className="flex w-full cursor-pointer items-start justify-between gap-2 p-3 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{launch.title}</span>
                      <LaunchStatusBadge status={launch.status} />
                      <LaunchPhaseBadge phase={calcLaunchPhase(launch)} />
                      <SectionStatusBadge status={launch.review_status} />
                      {launch.type && (
                        <span className="text-xs text-muted-foreground capitalize">{launch.type}</span>
                      )}
                      {launch.deletion_requested_at && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                          Exclusão a aguardar aprovação
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {date && <span>Dia D: {date}</span>}
                      {calc?.receita_liquida_total != null && (
                        <span className="font-medium text-foreground">
                          {fmtEur(calc.receita_liquida_total)} líquido
                          {calc.roas_total != null && ` · ROAS ${calc.roas_total.toFixed(1)}x`}
                        </span>
                      )}
                      {launch.promise && !calc?.receita_liquida_total && (
                        <span className="italic truncate max-w-xs">{launch.promise}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 mt-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setWizard({ open: true, launch });
                      }}
                      className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      title="Editar configuração"
                    >
                      <Settings2 className="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(launch.id);
                      }}
                      disabled={duplicating === launch.id}
                      className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                      title="Duplicar"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    {isExpanded
                      ? <ChevronDown className="size-4 text-muted-foreground" />
                      : <ChevronRight className="size-4 text-muted-foreground" />
                    }
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t">
                    {/* Tabs */}
                    <div className="flex border-b">
                      {(["planeamento", "metas", "debrief"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setActiveTab((prev) => ({ ...prev, [launch.id]: t }))}
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
                      {tab === "planeamento" && (
                        <PlaneamentoTab
                          launch={launch}
                          onEdit={() => setWizard({ open: true, launch })}
                        />
                      )}

                      {tab === "metas" && (
                        <LaunchGoalsCalculator
                          launch={launch}
                          debrief={
                            debrief && Object.keys(debrief).length > 0
                              ? (debrief as StudentLaunchDebrief)
                              : null
                          }
                          studentId=""
                        />
                      )}

                      {tab === "debrief" && (
                        <DebriefForm
                          launch={launch}
                          form={debriefForm}
                          calc={calc}
                          setDebrief={(patch) => setDebriefPatch(launch.id, patch)}
                          onSave={() => handleSaveDebrief(launch)}
                          saving={savingDebrief === launch.id}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <LaunchWizard
        open={wizard.open}
        launch={wizard.launch}
        studentId=""
        products={products}
        isCoach={false}
        onClose={() => setWizard({ open: false, launch: null })}
        onSaved={async (saved) => {
          await load();
          setExpandedId(saved.id);
        }}
      />
    </div>
  );
}
