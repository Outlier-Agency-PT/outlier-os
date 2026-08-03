import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Users, CheckSquare, Rocket, Target } from "lucide-react";
import { getRecentActivity, describeActivity } from "@/lib/queries/activity";
import { getInitiatives } from "@/lib/queries/initiatives";
import { getDecisions } from "@/lib/queries/decisions";
import { FocusWeek } from "@/components/dashboard/focus-week";
import { PendingDecisions } from "@/components/dashboard/pending-decisions";
import { ColaboradorDashboard } from "@/components/dashboard/colaborador/colaborador-dashboard";
import { DepartmentMetrics } from "@/components/dashboard/department-metrics";
import { AdminCheckpoints } from "@/components/dashboard/admin-checkpoints";
import { AdminDashboardWrapper } from "@/components/dashboard/admin-dashboard-wrapper";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import {
  getMyOpenTasks,
  getConcludedStatusId,
  getTodayTimeMinutes,
  getMyRunningTimeLog,
  getMyRecentTimeLogs,
  getMyNotifications,
  getMyOverdueTasks,
  getIncubadoraSummary,
  getUpcomingRenewals,
} from "@/lib/queries/dashboard-colaborador";
import {
  getDepartmentTaskCounts,
  getContentsPublishedThisMonth,
  getLaunchesDeliveredThisMonth,
} from "@/lib/queries/dashboard-departments";
import { getWeeklyCheckpoints } from "@/lib/actions/checkpoints";
import { getWeekStart } from "@/lib/utils/week-utils";
import { getStudentsWithRenewalAlerts } from "@/lib/queries/students";
import { formatRelative } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("team_members")
    .select("role, permissions_modules")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const isAdmin = member?.role === "admin";

  if (!isAdmin) {
    const hasIncubadora =
      member?.role === "admin" ||
      (member?.permissions_modules ?? []).includes("incubadora");

    const concludedStatusId = await getConcludedStatusId();
    const [tasks, todayMinutes, runningLog, recentLogs, notifResult, overdueTasks, renewals, incubadora] =
      await Promise.all([
        user ? getMyOpenTasks(user.id, concludedStatusId) : Promise.resolve([]),
        user ? getTodayTimeMinutes(user.id) : Promise.resolve(0),
        user ? getMyRunningTimeLog(user.id) : Promise.resolve(null),
        user ? getMyRecentTimeLogs(user.id) : Promise.resolve([]),
        user ? getMyNotifications(user.id) : Promise.resolve({ items: [], unread_count: 0 }),
        user ? getMyOverdueTasks(user.id) : Promise.resolve([]),
        hasIncubadora ? getUpcomingRenewals() : Promise.resolve([]),
        hasIncubadora ? getIncubadoraSummary() : Promise.resolve(null),
      ]);

    return (
      <>
        <PageHeader title="Dashboard" description="O teu dia, resumido." />
        <ColaboradorDashboard
          tasks={tasks}
          concludedStatusId={concludedStatusId}
          memberId={user?.id ?? ""}
          todayMinutes={todayMinutes}
          runningLog={runningLog}
          recentLogs={recentLogs}
          notifications={notifResult.items}
          unread_count={notifResult.unread_count}
          overdue_tasks={overdueTasks}
          incubadora={incubadora}
          renewals={renewals}
          hasIncubadora={hasIncubadora}
        />
      </>
    );
  }

  // getWeekStart() é síncrono — calculado antes do Batch A
  const adminWeekStart = getWeekStart();
  const concludedStatusId = await getConcludedStatusId();

  // Batch A: todas as queries independentes em paralelo
  const [
    taskClosedRes,
    launchClosedRes,
    clientActiveRes,
    activity,
    focusInitiatives,
    decisions,
    colabTasks,
    todayMinutes,
    runningLog,
    recentLogs,
    notifResult,
    overdueTasks,
    renewalAlerts,
    renewalsColab,
    incubadora,
    krsData,
    departmentTaskCounts,
    contentsPublished,
    launchesDelivered,
    adminCheckpoints,
  ] = await Promise.all([
    supabase.from("task_statuses").select("id").eq("key", "concluido").maybeSingle(),
    supabase.from("launch_statuses").select("id").in("key", ["concluido", "cancelado"]),
    supabase.from("client_statuses").select("id").eq("key", "ativo").maybeSingle(),
    getRecentActivity(10),
    getInitiatives({ focus: true }),
    getDecisions(),
    user ? getMyOpenTasks(user.id, concludedStatusId) : Promise.resolve([]),
    user ? getTodayTimeMinutes(user.id) : Promise.resolve(0),
    user ? getMyRunningTimeLog(user.id) : Promise.resolve(null),
    user ? getMyRecentTimeLogs(user.id) : Promise.resolve([]),
    user ? getMyNotifications(user.id) : Promise.resolve({ items: [], unread_count: 0 }),
    user ? getMyOverdueTasks(user.id) : Promise.resolve([]),
    getStudentsWithRenewalAlerts(),
    getUpcomingRenewals(),
    getIncubadoraSummary(),
    supabase.from("key_results").select("initial_value, current_value, target_value"),
    getDepartmentTaskCounts(concludedStatusId),
    getContentsPublishedThisMonth(),
    getLaunchesDeliveredThisMonth(),
    getWeeklyCheckpoints(adminWeekStart),
  ]);

  // Batch B: só as 3 queries que dependem dos status IDs do Batch A
  const [clientesRes, tarefasRes, lancamentosRes] = await Promise.all([
    clientActiveRes.data?.id
      ? supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("status_id", clientActiveRes.data.id)
      : supabase.from("clients").select("*", { count: "exact", head: true }),
    taskClosedRes.data?.id
      ? supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .neq("status_id", taskClosedRes.data.id)
      : supabase.from("tasks").select("*", { count: "exact", head: true }),
    launchClosedRes.data && launchClosedRes.data.length > 0
      ? supabase
          .from("launches")
          .select("*", { count: "exact", head: true })
          .not(
            "status_id",
            "in",
            `(${launchClosedRes.data.map((s: { id: string }) => s.id).join(",")})`,
          )
      : supabase.from("launches").select("*", { count: "exact", head: true }),
  ]);

  const krs = krsData.data;
  let okrAvg: number | null = null;
  if (krs && krs.length > 0) {
    let total = 0;
    let count = 0;
    for (const kr of krs as {
      initial_value: number;
      current_value: number;
      target_value: number;
    }[]) {
      const range = kr.target_value - kr.initial_value;
      if (range === 0) continue;
      const p = ((kr.current_value - kr.initial_value) / range) * 100;
      total += Math.max(0, Math.min(100, p));
      count++;
    }
    okrAvg = count > 0 ? total / count : null;
  }

  const kpis = [
    { label: "Clientes Ativos", value: clientesRes.count ?? 0, icon: Users },
    { label: "Tarefas Abertas", value: tarefasRes.count ?? 0, icon: CheckSquare },
    { label: "Lançamentos Ativos", value: lancamentosRes.count ?? 0, icon: Rocket },
    {
      label: "Progresso OKRs",
      value: okrAvg !== null ? `${okrAvg.toFixed(0)}%` : "—",
      icon: Target,
    },
  ];

  const adminFriday = new Date(adminWeekStart);
  adminFriday.setDate(adminWeekStart.getDate() + 4);
  const fmtD = (d: Date) =>
    d.toLocaleDateString("pt-PT", { day: "numeric", month: "long" });
  const adminWeekLabel = `${fmtD(adminWeekStart)} a ${fmtD(adminFriday)}`;

  const focusCount = focusInitiatives.length;
  const pendingCount = decisions.filter((d) => d.status === "pendente").length;

  const todayLabel = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const adminView = (
    <div className="flex flex-col gap-6 p-4 md:p-8">

      {/* Tarefas de hoje do admin */}
      <div className="w-full border border-border bg-card">
        <TodayTasks memberId={user?.id ?? ""} />
      </div>

      {/* Camada estratégica — dois painéis numa superfície unificada */}
      <div className="grid w-full gap-px border border-border bg-border lg:grid-cols-2">
        <div className="w-full overflow-hidden bg-card">
          <FocusWeek initiatives={focusInitiatives} />
        </div>
        <div className="w-full overflow-hidden bg-card">
          <PendingDecisions decisions={decisions} />
        </div>
      </div>

      {/* KPIs — colunas de texto; o container é o único "card" */}
      <div className="grid w-full grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-card px-4 py-4 md:px-6 md:py-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {kpi.label}
                </span>
                <Icon className="size-3.5 text-muted-foreground/25" />
              </div>
              <p className="text-[40px] font-light leading-none tracking-[-0.03em] tabular-nums">
                {kpi.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Métricas por Departamento */}
      <DepartmentMetrics
        vendas={{
          openTasks: departmentTaskCounts.vendas,
          activeLaunches: lancamentosRes.count ?? 0,
          activeClients: clientesRes.count ?? 0,
        }}
        marketing={{
          openTasks: departmentTaskCounts.marketing,
          contentsPublished,
        }}
        operacoesDesign={{
          openTasks: departmentTaskCounts.operacoesDesign,
          launchesDelivered,
        }}
        desenvolvimento={{
          openTasks: departmentTaskCounts.desenvolvimento,
        }}
      />

      {/* Renovações Próximas — só aparece se houver alertas */}
      {renewalAlerts.length > 0 && (
        <div>
          <div className="border-b border-border pb-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Renovações Próximas
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {renewalAlerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  href={`/incubadora/${alert.id}`}
                  className="-mx-1 flex items-baseline justify-between gap-4 px-1 py-3 hover:bg-muted/30"
                >
                  <p className="min-w-0 flex-1 text-sm leading-snug">
                    <span className="font-medium tracking-[-0.01em]">{alert.name}</span>
                    {alert.coach && (
                      <span className="font-light text-muted-foreground">
                        {" "}· {alert.coach.full_name}
                      </span>
                    )}
                  </p>
                  <span
                    className={`shrink-0 text-[11px] tabular-nums ${
                      alert.dias_restantes <= 7
                        ? "font-medium text-red-600"
                        : alert.dias_restantes <= 30
                          ? "text-amber-600"
                          : "text-muted-foreground/45"
                    }`}
                  >
                    {alert.dias_restantes < 0
                      ? `${Math.abs(alert.dias_restantes)}d em atraso`
                      : alert.dias_restantes === 0
                        ? "hoje"
                        : `${alert.dias_restantes}d`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Atividade — sem wrapper de card, lista editorial pura */}
      <div>
        <div className="border-b border-border pb-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Atividade Recente
          </h2>
        </div>
        {activity.length === 0 ? (
          <p className="py-6 text-sm font-light text-muted-foreground">
            Sem atividade ainda. Cria clientes, tarefas ou lançamentos para preencher o feed.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <p className="min-w-0 flex-1 text-sm leading-snug">
                  <span className="font-medium tracking-[-0.01em]">
                    {a.member?.full_name ?? "Sistema"}
                  </span>{" "}
                  <span className="font-light text-muted-foreground">
                    {describeActivity(a)}
                  </span>
                </p>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/45">
                  {formatRelative(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Checkpoints da Equipa */}
      <div className="w-full border border-border bg-card px-4 py-1 md:px-6">
        <AdminCheckpoints
          checkpoints={adminCheckpoints}
          weekLabel={adminWeekLabel}
        />
      </div>

    </div>
  );

  const colaboradorView = (
    <ColaboradorDashboard
      tasks={colabTasks}
      concludedStatusId={concludedStatusId}
      memberId={user?.id ?? ""}
      todayMinutes={todayMinutes}
      runningLog={runningLog}
      recentLogs={recentLogs}
      notifications={notifResult.items}
      unread_count={notifResult.unread_count}
      overdue_tasks={overdueTasks}
      incubadora={incubadora}
      renewals={renewalsColab}
      hasIncubadora={true}
    />
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${todayLabel} · ${focusCount} no foco · ${pendingCount} decisões à tua espera`}
      />
      <AdminDashboardWrapper adminView={adminView} colaboradorView={colaboradorView} />
    </>
  );
}
