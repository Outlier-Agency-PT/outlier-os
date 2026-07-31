"use client";

import { useState, useTransition } from "react";
import {
  FileText, Plus, Download, Eye, Trash2, Globe, Lock,
  CheckCircle2, Circle, TrendingUp, Users, Rocket, BookOpen,
  CalendarDays, MessageSquare, Package, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  generateStudentReportAction,
  publishStudentReportAction,
  unpublishStudentReportAction,
  deleteStudentReportAction,
} from "@/lib/actions/student-reports";
import type { StudentReport, ReportSnapshot } from "@/lib/types/student-reports";
import { isFullSnapshot } from "@/lib/types/student-reports";
import { exportReportToPDF } from "@/lib/utils/pdf-report";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  studentId: string;
  studentName: string;
  isStaff: boolean;
  initialReports: StudentReport[];
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso.includes("T") ? iso : iso + "T00:00:00").toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtNum(v: number | null | undefined, suffix = "") {
  if (v == null) return "—";
  return v.toLocaleString("pt-PT") + suffix;
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return "—";
  return (v * 100).toFixed(0) + "%";
}

// ── Micro-components ──────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm border-b border-border/50 last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ExpandableText({ text, limit = 200 }: { text: string; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const needsTrunc = text.length > limit;
  return (
    <div className="text-sm text-foreground/90">
      <p className="whitespace-pre-wrap leading-relaxed">
        {needsTrunc && !expanded ? text.slice(0, limit) + "…" : text}
      </p>
      {needsTrunc && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? <><ChevronUp className="size-3" /> Ver menos</> : <><ChevronDown className="size-3" /> Ver mais</>}
        </button>
      )}
    </div>
  );
}

// ── Renewal badge ─────────────────────────────────────────────────────────────

function RenewalBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    renovado:    { label: "Renovado",     className: "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400" },
    nao_renovado:{ label: "Não Renovado", className: "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400" },
    bonus:       { label: "Bónus",        className: "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400" },
    pendente:    { label: "Pendente",     className: "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400" },
  };
  const cfg = map[status] ?? map.pendente;
  return <Badge variant="outline" className={cn("text-xs", cfg.className)}>{cfg.label}</Badge>;
}

// ── Launch status badge ───────────────────────────────────────────────────────

function LaunchBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    planeado:  { label: "Planeado",  className: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400" },
    em_curso:  { label: "Em curso",  className: "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400" },
    concluido: { label: "Concluído", className: "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400" },
    cancelado: { label: "Cancelado", className: "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400" },
  };
  const cfg = map[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={cn("text-xs", cfg.className)}>{cfg.label}</Badge>;
}

// ── Level badge ───────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    aprendiz:   "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400",
    fazedor:    "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400",
    referencia: "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400",
    suspenso:   "border-muted-foreground/40 text-muted-foreground",
  };
  const labels: Record<string, string> = {
    aprendiz: "Aprendiz", fazedor: "Fazedor", referencia: "Referência", suspenso: "Suspenso",
  };
  return (
    <Badge variant="outline" className={cn("text-xs capitalize", map[level])}>
      {labels[level] ?? level}
    </Badge>
  );
}

// ── Tab: Resumo ───────────────────────────────────────────────────────────────

function TabResumo({ s, agg }: { s: ReportSnapshot["student"]; agg: ReportSnapshot["aggregate"] }) {
  const roi = agg.roi;
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard label="Sessões" value={`${agg.sessions_completed}/${agg.sessions_total}`} sub="concluídas" />
        <KpiCard label="Checklist" value={`${agg.checklist_completed}/${agg.checklist_total}`} sub="itens" />
        <KpiCard label="Lançamentos" value={agg.launches_total} sub={`${agg.launches_completed} concluídos`} />
        <KpiCard label="ROI" value={roi != null ? fmtPct(roi) : "—"} sub={roi != null && roi >= 1 ? "positivo" : roi != null ? "abaixo de 1×" : "sem dados"} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard label="Receita" value={fmtNum(agg.revenue_generated, "€")} />
        <KpiCard label="Investimento" value={fmtNum(agg.investment_budget, "€")} />
        <KpiCard label="Produtos" value={agg.products_total} sub={`${agg.products_active} activos`} />
        <KpiCard label="Reuniões" value={agg.meetings_in_period} sub="no período" />
      </div>

      {/* Identification */}
      <Section title="Identificação">
        <div className="rounded-lg border px-3 py-1">
          <Row label="Nome" value={s.name} />
          <Row label="Nível" value={<LevelBadge level={s.level} />} />
          <Row label="Status" value={s.status} />
          <Row label="Coach" value={s.coach_name} />
          {s.turma && <Row label="Turma" value={s.turma} />}
          {s.entry_type && <Row label="Tipo de entrada" value={s.entry_type} />}
          {s.nicho && <Row label="Nicho" value={s.nicho} />}
          {s.subnicho && <Row label="Subnicho" value={s.subnicho} />}
          {s.priority && <Row label="Prioridade" value={s.priority} />}
          {s.email && <Row label="Email" value={s.email} />}
          {s.phone && <Row label="Telefone" value={s.phone} />}
          {s.instagram && <Row label="Instagram" value={`@${s.instagram}`} />}
          {s.start_date && <Row label="Início" value={fmtDate(s.start_date)} />}
          {s.end_date && <Row label="Fim" value={fmtDate(s.end_date)} />}
        </div>
      </Section>

      {/* Renewal */}
      <Section title="Renovação">
        <div className="rounded-lg border px-3 py-1">
          <Row label="Status" value={<RenewalBadge status={s.renewal_status} />} />
          {s.renewal_date && <Row label="Data prevista" value={fmtDate(s.renewal_date)} />}
          {s.renewal_decided_at && <Row label="Decisão em" value={fmtDate(s.renewal_decided_at)} />}
          {s.renewal_notes && <Row label="Notas" value={s.renewal_notes} />}
        </div>
      </Section>
    </div>
  );
}

// ── Tab: Negócio ──────────────────────────────────────────────────────────────

function TabNegocio({
  briefing,
  products,
}: {
  briefing: ReportSnapshot["briefing"];
  products: ReportSnapshot["products"];
}) {
  const n = briefing?.negocio;
  const objecoes = briefing?.objecoes ?? [];

  return (
    <div className="space-y-6">
      {!briefing && (
        <p className="text-sm text-muted-foreground italic">Briefing não preenchido.</p>
      )}

      {n && (
        <>
          <Section title="Dados Gerais">
            <div className="rounded-lg border px-3 py-1">
              {n.nome_negocio && <Row label="Nome" value={n.nome_negocio} />}
              {n.nicho && <Row label="Nicho" value={n.nicho} />}
              {n.proposta_valor && <Row label="Proposta de valor" value={n.proposta_valor} />}
              {n.diferencial && <Row label="Diferencial" value={n.diferencial} />}
              {n.missao && <Row label="Missão" value={n.missao} />}
              {n.visao && <Row label="Visão" value={n.visao} />}
            </div>
            {n.historia && (
              <div className="mt-2 rounded-lg border p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">História</p>
                <ExpandableText text={n.historia} />
              </div>
            )}
            {n.resultados_passados && (
              <div className="mt-2 rounded-lg border p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Resultados Passados</p>
                <ExpandableText text={n.resultados_passados} />
              </div>
            )}
          </Section>

          {(n.publico_alvo || n.transformacao_entregue || (n.dores_resolvidas ?? []).length > 0) && (
            <Section title="Público e Transformação">
              {n.publico_alvo && (
                <div className="rounded-lg border p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Público-alvo</p>
                  <ExpandableText text={n.publico_alvo} />
                </div>
              )}
              {n.transformacao_entregue && (
                <div className="rounded-lg border p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Transformação entregue</p>
                  <ExpandableText text={n.transformacao_entregue} />
                </div>
              )}
              {(n.dores_resolvidas ?? []).length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Dores resolvidas</p>
                  <ul className="space-y-1">
                    {n.dores_resolvidas!.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 shrink-0 text-muted-foreground">•</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {(n.objetivos ?? []).length > 0 && (
            <Section title="Objetivos">
              <div className="space-y-1.5">
                {n.objetivos!.map((o, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
                    <Badge variant="outline" className={cn("shrink-0 text-[10px]",
                      o.prioridade === "alta" ? "border-red-300 text-red-700" :
                      o.prioridade === "media" ? "border-amber-300 text-amber-700" :
                      "border-muted-foreground/30 text-muted-foreground"
                    )}>
                      {o.prioridade}
                    </Badge>
                    <span>{o.descricao}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {n.swot && (
            <Section title="SWOT">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "forcas",       label: "Forças",        color: "text-green-700 dark:text-green-400" },
                  { key: "fraquezas",    label: "Fraquezas",     color: "text-red-700 dark:text-red-400" },
                  { key: "oportunidades",label: "Oportunidades", color: "text-blue-700 dark:text-blue-400" },
                  { key: "ameacas",      label: "Ameaças",       color: "text-amber-700 dark:text-amber-400" },
                ].map(({ key, label, color }) => {
                  const items = (n.swot as any)[key] as string[] ?? [];
                  if (!items.length) return null;
                  return (
                    <div key={key} className="rounded-lg border p-2.5">
                      <p className={cn("mb-1.5 text-xs font-semibold", color)}>{label}</p>
                      <ul className="space-y-0.5">
                        {items.map((it, i) => (
                          <li key={i} className="text-xs text-foreground/80">• {it}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {(n.concorrentes ?? []).length > 0 && (
            <Section title="Concorrentes">
              <div className="space-y-1.5">
                {n.concorrentes!.map((c, i) => (
                  <div key={i} className="rounded-lg border p-2.5 text-sm">
                    <span className="font-medium">{c.nome}</span>
                    {c.url && <span className="ml-2 text-xs text-muted-foreground">{c.url}</span>}
                    {c.observacoes && <p className="mt-0.5 text-xs text-foreground/70">{c.observacoes}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {objecoes.length > 0 && (
            <Section title="Objeções e Respostas">
              <div className="space-y-2">
                {objecoes.map((o, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Objeção</p>
                    <p className="text-sm">{o.objecao}</p>
                    <p className="text-xs font-medium text-muted-foreground">Resposta</p>
                    <p className="text-sm">{o.resposta}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {/* Products */}
      {products.length > 0 && (
        <Section title="Catálogo de Produtos">
          <div className="space-y-2">
            {products.map((p, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{p.name}</span>
                  {p.is_archived && <Badge variant="outline" className="text-[10px] text-muted-foreground">arquivado</Badge>}
                  <Badge variant="outline" className={cn("text-[10px]",
                    p.product_status === "activo" ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400" :
                    p.product_status === "inactivo" ? "border-red-300 text-red-700" :
                    "border-muted-foreground/30 text-muted-foreground"
                  )}>{p.product_status}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                  {p.product_type && <span>{p.product_type}</span>}
                  {p.price != null && <span>{fmtNum(p.price, "€")}</span>}
                  {p.value_ladder_position != null && <span>Posição {p.value_ladder_position}</span>}
                </div>
                {p.promise && <p className="text-xs text-foreground/80 italic">"{p.promise}"</p>}
                {p.description && <p className="text-xs text-foreground/70">{p.description}</p>}
                {p.beneficios.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Benefícios</p>
                    {p.beneficios.map((b, j) => <p key={j} className="text-xs">• {b}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Tab: Financeiro ───────────────────────────────────────────────────────────

function TabFinanceiro({
  s,
  agg,
  revenue_history,
}: {
  s: ReportSnapshot["student"];
  agg: ReportSnapshot["aggregate"];
  revenue_history: ReportSnapshot["revenue_history"];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <KpiCard label="Receita gerada" value={fmtNum(agg.revenue_generated, "€")} />
        <KpiCard label="Investimento" value={fmtNum(agg.investment_budget, "€")} />
        <KpiCard label="ROI" value={agg.roi != null ? fmtPct(agg.roi) : "—"} />
      </div>
      {s.revenue_goal != null && (
        <Section title="Objetivo">
          <div className="rounded-lg border px-3 py-1">
            <Row label="Objetivo de receita" value={fmtNum(s.revenue_goal, "€")} />
            {agg.revenue_generated > 0 && s.revenue_goal > 0 && (
              <Row
                label="% do objetivo atingida"
                value={`${((agg.revenue_generated / s.revenue_goal) * 100).toFixed(0)}%`}
              />
            )}
          </div>
        </Section>
      )}

      {revenue_history.length > 0 && (
        <Section title="Histórico de Receita">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Data</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Valor</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Nota</th>
                </tr>
              </thead>
              <tbody>
                {revenue_history.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(r.date)}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtNum(r.value, "€")}</td>
                    <td className="px-3 py-2 text-xs text-foreground/70">{r.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Tab: Progresso ────────────────────────────────────────────────────────────

function TabProgresso({
  sessions,
  checklist,
  checklist_notes,
  agg,
}: {
  sessions: ReportSnapshot["sessions"];
  checklist: ReportSnapshot["checklist"];
  checklist_notes: ReportSnapshot["checklist_notes"];
  agg: ReportSnapshot["aggregate"];
}) {
  const groups = checklist
    ? Array.from(new Set(checklist.map((c) => c.group)))
    : [];

  return (
    <div className="space-y-6">
      {/* Sessions */}
      <Section title={`Sessões de Acompanhamento — ${agg.sessions_completed}/${agg.sessions_total}`}>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sem sessões registadas.</p>
        ) : (
          <div className="space-y-1.5">
            {sessions.map((ss, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border px-3 py-2">
                {ss.completed ? (
                  <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                )}
                <span className="flex-1 text-sm">{ss.label}</span>
                {ss.completed_at && (
                  <span className="text-xs text-muted-foreground">{fmtDate(ss.completed_at)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Checklist */}
      <Section title={`Checklist — ${agg.checklist_completed}/${agg.checklist_total}`}>
        {!checklist ? (
          <p className="text-sm text-muted-foreground italic">Checklist não preenchido.</p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group}>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {group}
                </p>
                <div className="space-y-1">
                  {checklist
                    .filter((c) => c.group === group)
                    .map((c, i) => (
                      <div key={i} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                        {c.done ? (
                          <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted-foreground/30" />
                        )}
                        <span className={cn("text-sm", !c.done && "text-muted-foreground")}>
                          {c.label}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
            {checklist_notes && (
              <div className="rounded-lg border p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Notas</p>
                <p className="text-sm">{checklist_notes}</p>
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Tab: Lançamentos ──────────────────────────────────────────────────────────

function TabLancamentos({ launches }: { launches: ReportSnapshot["launches"] }) {
  if (launches.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sem lançamentos registados.</p>;
  }

  return (
    <div className="space-y-4">
      {launches.map((l, i) => {
        const d = l.debrief;
        const totalReceita =
          d ? (d.receita_liquida_fase_venda ?? 0) + (d.downsell_receita_liquida ?? 0) : 0;
        const roas =
          d && d.investimento_total && d.investimento_total > 0
            ? totalReceita / d.investimento_total
            : null;

        return (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start gap-2 flex-wrap">
              <span className="font-medium flex-1">{l.title}</span>
              <LaunchBadge status={l.status} />
            </div>

            {/* Planning */}
            <div className="rounded-md bg-muted/30 px-3 py-1 space-y-0">
              <Row label="Tipo" value={l.type} />
              <Row label="Ticket" value={l.ticket != null ? fmtNum(l.ticket, "€") : null} />
              <Row label="Data do evento" value={fmtDate(l.launch_date)} />
              <Row label="Início → Fim" value={l.start_date ? `${fmtDate(l.start_date)} → ${fmtDate(l.end_date)}` : null} />
              {l.channels.length > 0 && <Row label="Canais" value={l.channels.join(", ")} />}
              {l.budget_total > 0 && <Row label="Orçamento total" value={fmtNum(l.budget_total, "€")} />}
              {l.sales_goal_1_count != null && (
                <Row label="Meta 1" value={`${fmtNum(l.sales_goal_1_count)} vendas · ${fmtNum(l.sales_goal_1_revenue, "€")}`} />
              )}
              {l.sales_goal_2_count != null && (
                <Row label="Meta 2" value={`${fmtNum(l.sales_goal_2_count)} vendas · ${fmtNum(l.sales_goal_2_revenue, "€")}`} />
              )}
            </div>

            {l.goal && (
              <div>
                <p className="mb-0.5 text-xs font-medium text-muted-foreground">Objetivo</p>
                <p className="text-sm">{l.goal}</p>
              </div>
            )}
            {l.promise && (
              <p className="text-sm italic text-foreground/70">"{l.promise}"</p>
            )}

            {/* Debrief */}
            {d && (
              <div className="rounded-md border border-dashed p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Debrief</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {d.leads_totais != null && <Row label="Leads totais" value={fmtNum(d.leads_totais)} />}
                  {d.visitantes_pagina != null && <Row label="Visitantes LP" value={fmtNum(d.visitantes_pagina)} />}
                  {d.leads_wpp != null && <Row label="Leads WhatsApp" value={fmtNum(d.leads_wpp)} />}
                  {d.ao_vivo_estavel != null && <Row label="Ao vivo (estável)" value={fmtNum(d.ao_vivo_estavel)} />}
                  {d.ao_vivo_maximo != null && <Row label="Ao vivo (máx.)" value={fmtNum(d.ao_vivo_maximo)} />}
                  {d.total_vendas != null && <Row label="Vendas" value={fmtNum(d.total_vendas)} />}
                  {d.downsell_vendas != null && <Row label="Vendas downsell" value={fmtNum(d.downsell_vendas)} />}
                  {d.referencias_geradas != null && <Row label="Referências" value={fmtNum(d.referencias_geradas)} />}
                  {d.investimento_total != null && <Row label="Investimento" value={fmtNum(d.investimento_total, "€")} />}
                  {d.receita_liquida_fase_venda != null && <Row label="Receita (venda)" value={fmtNum(d.receita_liquida_fase_venda, "€")} />}
                  {d.downsell_receita_liquida != null && <Row label="Receita (downsell)" value={fmtNum(d.downsell_receita_liquida, "€")} />}
                  {totalReceita > 0 && <Row label="Receita total" value={<span className="font-bold">{fmtNum(totalReceita, "€")}</span>} />}
                  {roas != null && <Row label="ROAS" value={`${roas.toFixed(2)}×`} />}
                </div>
                {d.observacoes && (
                  <div className="mt-2">
                    <p className="mb-0.5 text-xs font-medium text-muted-foreground">Observações</p>
                    <ExpandableText text={d.observacoes} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Acompanhamento ───────────────────────────────────────────────────────

function TabAcompanhamento({
  notes_in_period,
  notes_history,
  period_start,
  period_end,
}: {
  notes_in_period: ReportSnapshot["notes_in_period"];
  notes_history: ReportSnapshot["notes_history"];
  period_start: string;
  period_end: string;
}) {
  return (
    <div className="space-y-6">
      <Section title={`Contactos no Período (${fmtDate(period_start)} → ${fmtDate(period_end)})`}>
        {notes_in_period.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum contacto neste período.</p>
        ) : (
          <div className="space-y-3">
            {notes_in_period.map((n, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{n.contact_type}</Badge>
                  <span className="text-xs text-muted-foreground">{fmtDate(n.date)}</span>
                  <span className="text-xs text-muted-foreground">· {n.author}</span>
                </div>
                <ExpandableText text={n.content} />
                {n.involvement && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Envolvimento:</span> {n.involvement}
                  </p>
                )}
                {n.motivation && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Motivação:</span> {n.motivation}
                  </p>
                )}
                {n.reminder_date && (
                  <p className="text-xs text-muted-foreground">
                    🔔 Lembrete: {fmtDate(n.reminder_date)}
                    {n.reminder_note && ` — ${n.reminder_note}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {notes_history.length > 0 && (
        <Section title="Histórico Anterior">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Data</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Autor</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Sumário</th>
                </tr>
              </thead>
              <tbody>
                {notes_history.map((n, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(n.date)}</td>
                    <td className="px-3 py-2 text-xs">{n.contact_type}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{n.author}</td>
                    <td className="px-3 py-2 text-xs text-foreground/70 max-w-xs">{n.content_preview}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Tab: Diário ───────────────────────────────────────────────────────────────

function TabDiario({ diary }: { diary: ReportSnapshot["diary"] }) {
  if (diary.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sem entradas no diário.</p>;
  }
  return (
    <div className="space-y-3">
      {diary.map((d, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{fmtDate(d.date)}</span>
            {d.updated_at !== d.date && (
              <span className="text-xs text-muted-foreground/60">editado {fmtDate(d.updated_at)}</span>
            )}
          </div>
          <ExpandableText text={d.content} limit={300} />
        </div>
      ))}
    </div>
  );
}

// ── Tab: Reuniões ─────────────────────────────────────────────────────────────

function TabReunioes({
  meetings_in_period,
  other_meetings,
  period_start,
  period_end,
}: {
  meetings_in_period: ReportSnapshot["meetings_in_period"];
  other_meetings: ReportSnapshot["other_meetings"];
  period_start: string;
  period_end: string;
}) {
  return (
    <div className="space-y-6">
      <Section title={`No Período (${fmtDate(period_start)} → ${fmtDate(period_end)})`}>
        {meetings_in_period.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhuma reunião neste período.</p>
        ) : (
          <div className="space-y-3">
            {meetings_in_period.map((m, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">{m.title}</p>
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>{new Date(m.date).toLocaleString("pt-PT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  {m.duration_minutes && <span>· {m.duration_minutes} min</span>}
                  {m.location && <span>· {m.location}</span>}
                </div>
                {m.agenda_md && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Agenda</p>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.agenda_md}</ReactMarkdown>
                    </div>
                  </div>
                )}
                {m.notes_md && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Notas</p>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.notes_md}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {other_meetings.length > 0 && (
        <Section title="Outras Reuniões">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Data</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Reunião</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Duração</th>
                </tr>
              </thead>
              <tbody>
                {other_meetings.map((m, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(m.date)}</td>
                    <td className="px-3 py-2 text-xs">{m.title}</td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {m.duration_minutes ? `${m.duration_minutes} min` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Report Viewer ─────────────────────────────────────────────────────────────

function ReportViewer({
  report,
  isStaff,
  isPending,
  onPublishToggle,
  onClose,
}: {
  report: StudentReport;
  isStaff: boolean;
  isPending: boolean;
  onPublishToggle: (r: StudentReport) => void;
  onClose: () => void;
}) {
  const snap = isFullSnapshot(report.kpis) ? report.kpis : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-0 p-0">
        {/* Fixed header */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{report.title}</DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {fmtDate(report.period_start)} → {fmtDate(report.period_end)}
                {report.generator && ` · por ${report.generator.full_name}`}
                {" · "}gerado a {fmtDate(report.created_at)}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-xs",
                report.status === "publicado"
                  ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
                  : "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {report.status === "publicado" ? "Publicado" : "Rascunho"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {snap ? (
            <Tabs defaultValue="resumo" className="flex h-full flex-col">
              {/* Tab bar */}
              <TabsList className="w-full shrink-0 justify-start rounded-none border-b bg-transparent px-4 py-0 h-auto overflow-x-auto">
                {[
                  { v: "resumo",         label: "Resumo",         icon: TrendingUp },
                  { v: "negocio",        label: "Negócio",        icon: Package },
                  { v: "financeiro",     label: "Financeiro",     icon: TrendingUp },
                  { v: "progresso",      label: "Progresso",      icon: CheckCircle2 },
                  { v: "lancamentos",    label: "Lançamentos",    icon: Rocket },
                  { v: "acompanhamento", label: "Acompanhamento", icon: MessageSquare },
                  { v: "diario",         label: "Diário",         icon: BookOpen },
                  { v: "reunioes",       label: "Reuniões",       icon: CalendarDays },
                ].map(({ v, label }) => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs font-medium data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5">
                <TabsContent value="resumo" className="m-0">
                  <TabResumo s={snap.student} agg={snap.aggregate} />
                </TabsContent>
                <TabsContent value="negocio" className="m-0">
                  <TabNegocio briefing={snap.briefing} products={snap.products} />
                </TabsContent>
                <TabsContent value="financeiro" className="m-0">
                  <TabFinanceiro s={snap.student} agg={snap.aggregate} revenue_history={snap.revenue_history} />
                </TabsContent>
                <TabsContent value="progresso" className="m-0">
                  <TabProgresso
                    sessions={snap.sessions}
                    checklist={snap.checklist}
                    checklist_notes={snap.checklist_notes}
                    agg={snap.aggregate}
                  />
                </TabsContent>
                <TabsContent value="lancamentos" className="m-0">
                  <TabLancamentos launches={snap.launches} />
                </TabsContent>
                <TabsContent value="acompanhamento" className="m-0">
                  <TabAcompanhamento
                    notes_in_period={snap.notes_in_period}
                    notes_history={snap.notes_history}
                    period_start={report.period_start}
                    period_end={report.period_end}
                  />
                </TabsContent>
                <TabsContent value="diario" className="m-0">
                  <TabDiario diary={snap.diary} />
                </TabsContent>
                <TabsContent value="reunioes" className="m-0">
                  <TabReunioes
                    meetings_in_period={snap.meetings_in_period}
                    other_meetings={snap.other_meetings}
                    period_start={report.period_start}
                    period_end={report.period_end}
                  />
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            /* Fallback for old reports (flat kpis, no structured snapshot) */
            <div className="p-5">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {report.content_md ?? ""}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <DialogFooter className="shrink-0 border-t px-6 py-3 flex-wrap gap-2">
          {isStaff && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => onPublishToggle(report)}
            >
              {report.status === "publicado" ? (
                <><Lock className="mr-1 size-3" />Reverter para rascunho</>
              ) : (
                <><Globe className="mr-1 size-3" />Publicar para o aluno</>
              )}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => exportReportToPDF(report)}>
            <Download className="mr-1 size-3" />
            Exportar PDF
          </Button>
          <Button size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StudentReportsTab({ studentId, studentName, isStaff, initialReports }: Props) {
  const [reports, setReports] = useState<StudentReport[]>(initialReports);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [viewingReport, setViewingReport] = useState<StudentReport | null>(null);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 8) + "01";

  const [form, setForm] = useState({
    title: "",
    period_start: firstOfMonth,
    period_end: today,
  });

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateStudentReportAction({
        student_id: studentId,
        title: form.title,
        period_start: form.period_start,
        period_end: form.period_end,
      });
      if ("error" in result && result.error) {
        const msg =
          "_form" in result.error
            ? (result.error as any)._form?.[0]
            : "Erro ao gerar relatório";
        toast.error(msg);
        return;
      }
      toast.success("Relatório gerado com sucesso");
      setShowGenerateDialog(false);
      setForm({ title: "", period_start: firstOfMonth, period_end: today });
      if ("data" in result && result.data) {
        setReports((prev) => [
          { ...(result.data as any), generator: null } as StudentReport,
          ...prev,
        ]);
      }
    });
  }

  function handlePublishToggle(report: StudentReport) {
    startTransition(async () => {
      const action =
        report.status === "publicado" ? unpublishStudentReportAction : publishStudentReportAction;
      const result = await action(report.id, studentId);
      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }
      const newStatus = report.status === "publicado" ? "rascunho" : "publicado";
      const updater = (r: StudentReport) =>
        r.id === report.id
          ? { ...r, status: newStatus as "rascunho" | "publicado", published_at: newStatus === "publicado" ? new Date().toISOString() : null }
          : r;
      setReports((prev) => prev.map(updater));
      if (viewingReport?.id === report.id) setViewingReport((v) => (v ? updater(v) : v));
      toast.success(newStatus === "publicado" ? "Relatório publicado" : "Revertido para rascunho");
    });
  }

  function handleDelete(report: StudentReport) {
    startTransition(async () => {
      const result = await deleteStudentReportAction(report.id, studentId);
      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      if (viewingReport?.id === report.id) setViewingReport(null);
      toast.success("Relatório eliminado");
    });
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reports.length === 0
            ? "Nenhum relatório gerado ainda."
            : `${reports.length} ${reports.length === 1 ? "relatório" : "relatórios"}`}
        </p>
        {isStaff && (
          <Button size="sm" onClick={() => setShowGenerateDialog(true)}>
            <Plus className="mr-1 size-3" />
            Gerar Relatório
          </Button>
        )}
      </div>

      {/* Empty state */}
      {reports.length === 0 ? (
        <div className="rounded-lg border border-dashed p-14 text-center">
          <FileText className="mx-auto mb-3 size-9 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            {isStaff
              ? `Nenhum relatório gerado para ${studentName}.`
              : "Ainda não tens relatórios disponíveis."}
          </p>
          {isStaff && (
            <Button size="sm" className="mt-4" onClick={() => setShowGenerateDialog(true)}>
              <Plus className="mr-1 size-3" />
              Gerar primeiro relatório
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{report.title}</p>
                    <Badge
                      variant="outline"
                      className={
                        report.status === "publicado"
                          ? "border-green-300 text-green-700 text-[10px] dark:border-green-700 dark:text-green-400"
                          : "text-[10px] border-muted-foreground/30 text-muted-foreground"
                      }
                    >
                      {report.status === "publicado" ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(report.period_start)} → {fmtDate(report.period_end)}
                    {report.generator && ` · por ${report.generator.full_name}`}
                    {" · "}gerado a {fmtDate(report.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon" variant="ghost" className="size-7"
                    title="Ver relatório"
                    onClick={() => setViewingReport(report)}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="size-7"
                    title="Exportar PDF"
                    onClick={() => exportReportToPDF(report)}
                  >
                    <Download className="size-3.5" />
                  </Button>
                  {isStaff && (
                    <>
                      <Button
                        size="icon" variant="ghost" className="size-7"
                        title={report.status === "publicado" ? "Reverter para rascunho" : "Publicar para o aluno"}
                        disabled={isPending}
                        onClick={() => handlePublishToggle(report)}
                      >
                        {report.status === "publicado" ? (
                          <Lock className="size-3.5 text-muted-foreground" />
                        ) : (
                          <Globe className="size-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive"
                        title="Eliminar relatório"
                        disabled={isPending}
                        onClick={() => handleDelete(report)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rep-title">Título</Label>
              <Input
                id="rep-title"
                placeholder="Ex: Relatório Julho 2026"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rep-start">Início do período</Label>
                <Input
                  id="rep-start" type="date" value={form.period_start}
                  onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rep-end">Fim do período</Label>
                <Input
                  id="rep-end" type="date" value={form.period_end}
                  onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              O relatório agrega automaticamente todas as informações do aluno: identificação, briefing, financeiro, sessões, checklist, produtos, lançamentos, acompanhamento, diário e reuniões.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isPending || !form.title || !form.period_start || !form.period_end}
            >
              {isPending ? "A gerar…" : "Gerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report viewer */}
      {viewingReport && (
        <ReportViewer
          report={viewingReport}
          isStaff={isStaff}
          isPending={isPending}
          onPublishToggle={handlePublishToggle}
          onClose={() => setViewingReport(null)}
        />
      )}
    </div>
  );
}
