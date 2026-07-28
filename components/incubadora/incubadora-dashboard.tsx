"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Users, TrendingUp, MessageCircle, Phone, ChevronRight, RefreshCw } from "lucide-react";
import { getIncubadoraStatsAction } from "@/lib/actions/students";
import type { IncubadoraStats } from "@/lib/queries/students";

const FIVE_MINUTES = 5 * 60 * 1000;

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  valueColor = "text-foreground",
  progress,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
  progress?: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-card px-4 py-5 md:px-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground/20">{icon}</span>}
      </div>
      <p className={`text-[38px] font-light leading-none tracking-[-0.03em] tabular-nums ${valueColor}`}>
        {value}
      </p>
      {progress !== undefined && (
        <div className="mt-3 h-1 w-full overflow-hidden bg-muted">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {sub && (
        <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid w-full grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-card px-4 py-5 md:px-6">
          <div className="mb-3 h-3 w-24 rounded animate-pulse bg-muted" />
          <div className="h-9 w-16 rounded animate-pulse bg-muted" />
        </div>
      ))}
    </div>
  );
}

// ── Alerts ────────────────────────────────────────────────────────────────────

interface Alert {
  text: string;
  level: "critical" | "warning";
  href: string;
}

function studentHref(ids: string[]): string {
  if (ids.length === 1) return `/incubadora/${ids[0]}`;
  return "/incubadora";
}

function buildAlerts(s: IncubadoraStats): Alert[] {
  const list: Alert[] = [];

  if (s.emergencia.pendentes > 0)
    list.push({
      text: `${s.emergencia.pendentes} chamada${s.emergencia.pendentes !== 1 ? "s" : ""} de emergência pendente${s.emergencia.pendentes !== 1 ? "s" : ""}`,
      level: "critical",
      href: "/incubadora",
    });

  if (s.progresso.alunos_inativos_14dias > 0)
    list.push({
      text: `${s.progresso.alunos_inativos_14dias} aluno${s.progresso.alunos_inativos_14dias !== 1 ? "s" : ""} sem actividade há mais de 14 dias`,
      level: "critical",
      href: studentHref(s.progresso.inativos_14dias_ids),
    });

  if (s.suporte.urgentes > 0)
    list.push({
      text: `${s.suporte.urgentes} ticket${s.suporte.urgentes !== 1 ? "s" : ""} urgente${s.suporte.urgentes !== 1 ? "s" : ""} sem resposta`,
      level: "critical",
      href: "/incubadora/suporte",
    });

  if (s.renovacoes.em_atraso > 0)
    list.push({
      text: `${s.renovacoes.em_atraso} renovaç${s.renovacoes.em_atraso !== 1 ? "ões" : "ão"} em atraso`,
      level: "warning",
      href: "/incubadora",
    });

  if (s.progresso.alunos_inativos_7dias > 0)
    list.push({
      text: `${s.progresso.alunos_inativos_7dias} aluno${s.progresso.alunos_inativos_7dias !== 1 ? "s" : ""} sem actividade há mais de 7 dias`,
      level: "warning",
      href: studentHref(s.progresso.inativos_7dias_ids),
    });

  if (s.roi.alunos_sem_receita > 0)
    list.push({
      text: `${s.roi.alunos_sem_receita} aluno${s.roi.alunos_sem_receita !== 1 ? "s" : ""} activo${s.roi.alunos_sem_receita !== 1 ? "s" : ""} sem receita registada`,
      level: "warning",
      href: studentHref(s.roi.sem_receita_ids),
    });

  return list;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function IncubadoraDashboard() {
  const router = useRouter();
  const [stats, setStats]             = useState<IncubadoraStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, startRefreshing] = useTransition();

  async function load(background = false) {
    const data = await getIncubadoraStatsAction();
    setStats(data);
    setLastRefresh(new Date());
    if (!background) setLoading(false);
  }

  function backgroundRefresh() {
    startRefreshing(async () => {
      await load(true);
      router.refresh();
    });
  }

  useEffect(() => {
    load();
    const id = setInterval(backgroundRefresh, FIVE_MINUTES);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (!stats) return null;

  const alerts = buildAlerts(stats);
  const ticketsOpen = stats.suporte.abertos + stats.suporte.em_analise;

  return (
    <div className="flex flex-col gap-3">
      {/* Indicador de actualização */}
      {lastRefresh && (
        <div className="flex justify-end">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
            {refreshing && (
              <RefreshCw className="size-3 animate-spin" />
            )}
            Actualizado às{" "}
            {lastRefresh.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}
      {/* Row 1 — Alunos */}
      <div className="grid w-full grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <KpiCard
          label="Alunos Activos"
          value={stats.alunos.ativos}
          sub={`${stats.alunos.total} no total`}
          valueColor={stats.alunos.ativos > 0 ? "text-emerald-600" : "text-foreground"}
          icon={<Users className="size-3.5" />}
        />
        <KpiCard
          label="Aprendizes"
          value={stats.alunos.por_nivel.aprendiz}
          sub="nível aprendiz"
        />
        <KpiCard
          label="Fazedores"
          value={stats.alunos.por_nivel.fazedor}
          sub="nível fazedor"
        />
        <KpiCard
          label="Referências"
          value={stats.alunos.por_nivel.referencia}
          sub="nível referência"
          valueColor={
            stats.alunos.por_nivel.referencia > 0 ? "text-emerald-600" : "text-muted-foreground"
          }
        />
      </div>

      {/* Row 2 — Saúde */}
      <div className="grid w-full grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <KpiCard
          label="Progresso Médio"
          value={`${stats.progresso.media_progresso}%`}
          sub="lições concluídas"
          progress={stats.progresso.media_progresso}
          icon={<TrendingUp className="size-3.5" />}
        />
        <KpiCard
          label="Em Risco"
          value={stats.progresso.alunos_inativos_7dias}
          sub="sem actividade +7d"
          valueColor={
            stats.progresso.alunos_inativos_7dias > 0 ? "text-amber-600" : "text-foreground"
          }
        />
        <KpiCard
          label="Abandono Iminente"
          value={stats.progresso.alunos_inativos_14dias}
          sub="sem actividade +14d"
          valueColor={
            stats.progresso.alunos_inativos_14dias > 0 ? "text-red-600" : "text-foreground"
          }
        />
        <KpiCard
          label="Sem Receita"
          value={stats.roi.alunos_sem_receita}
          sub="alunos activos"
          valueColor={
            stats.roi.alunos_sem_receita > 0 ? "text-red-600" : "text-foreground"
          }
        />
      </div>

      {/* Row 3 — Operações */}
      <div className="grid w-full grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <KpiCard
          label="Tickets Abertos"
          value={ticketsOpen}
          sub={
            stats.suporte.urgentes > 0
              ? `${stats.suporte.urgentes} urgente${stats.suporte.urgentes !== 1 ? "s" : ""}`
              : "sem urgentes"
          }
          valueColor={
            stats.suporte.urgentes > 0
              ? "text-red-600"
              : ticketsOpen > 0
              ? "text-amber-600"
              : "text-foreground"
          }
          icon={<MessageCircle className="size-3.5" />}
        />
        <KpiCard
          label="Chamadas Pendentes"
          value={stats.emergencia.pendentes}
          sub="emergência"
          valueColor={
            stats.emergencia.pendentes > 0 ? "text-red-600" : "text-foreground"
          }
          icon={<Phone className="size-3.5" />}
        />
        <KpiCard
          label="Renovações 30d"
          value={stats.renovacoes.proximas_30dias}
          sub={
            stats.renovacoes.em_atraso > 0
              ? `${stats.renovacoes.em_atraso} em atraso`
              : "dentro do prazo"
          }
          valueColor={
            stats.renovacoes.em_atraso > 0
              ? "text-red-600"
              : stats.renovacoes.proximas_30dias > 0
              ? "text-amber-600"
              : "text-foreground"
          }
        />
        <KpiCard
          label="ROI Positivo"
          value={stats.roi.alunos_com_roi_positivo}
          sub="receita ≥ investimento"
          valueColor={
            stats.roi.alunos_com_roi_positivo > 0 ? "text-emerald-600" : "text-muted-foreground"
          }
          icon={<TrendingUp className="size-3.5" />}
        />
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 md:px-6">
            <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <AlertTriangle className="size-3.5 text-amber-500" />
              Alertas
            </h3>
          </div>
          <ul className="divide-y divide-border">
            {alerts.map((alert, i) => (
              <li key={i}>
                <Link
                  href={alert.href}
                  className={`flex items-center gap-3 px-4 py-3 md:px-6 transition-colors group ${
                    alert.level === "critical"
                      ? "hover:bg-red-50 dark:hover:bg-red-950/20"
                      : "hover:bg-amber-50 dark:hover:bg-amber-950/20"
                  }`}
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      alert.level === "critical" ? "bg-[#A12B2B]" : "bg-amber-400"
                    }`}
                  />
                  <p
                    className={`flex-1 text-sm ${
                      alert.level === "critical"
                        ? "font-medium text-[#A12B2B] dark:text-red-400"
                        : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {alert.text}
                  </p>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
