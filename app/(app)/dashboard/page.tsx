import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Users, CheckSquare, Rocket, Target } from "lucide-react";
import { getRecentActivity, describeActivity } from "@/lib/queries/activity";
import { formatRelative } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [taskClosedRes, launchClosedRes, clientActiveRes, activity] = await Promise.all([
    supabase.from("task_statuses").select("id").eq("key", "concluido").maybeSingle(),
    supabase.from("launch_statuses").select("id").in("key", ["concluido", "cancelado"]),
    supabase.from("client_statuses").select("id").eq("key", "ativo").maybeSingle(),
    getRecentActivity(10),
  ]);

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

  // OKR progresso médio
  const { data: krs } = await supabase.from("key_results").select("initial_value, current_value, target_value");
  let okrAvg: number | null = null;
  if (krs && krs.length > 0) {
    let total = 0;
    let count = 0;
    for (const kr of krs as { initial_value: number; current_value: number; target_value: number }[]) {
      const range = kr.target_value - kr.initial_value;
      if (range === 0) continue;
      const p = ((kr.current_value - kr.initial_value) / range) * 100;
      total += Math.max(0, Math.min(100, p));
      count++;
    }
    okrAvg = count > 0 ? total / count : null;
  }

  const kpis = [
    { label: "Clientes Ativos", value: clientesRes.count ?? 0, icon: Users, tone: "text-blue-500" },
    { label: "Tarefas Abertas", value: tarefasRes.count ?? 0, icon: CheckSquare, tone: "text-orange-500" },
    { label: "Lançamentos Ativos", value: lancamentosRes.count ?? 0, icon: Rocket, tone: "text-purple-500" },
    { label: "Progresso OKRs", value: okrAvg !== null ? `${okrAvg.toFixed(0)}%` : "—", icon: Target, tone: "text-green-500" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral da Outlier Agency" />
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {kpi.label}
                  </CardTitle>
                  <Icon className={`size-5 ${kpi.tone}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{kpi.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem atividade ainda. Cria clientes, tarefas ou lançamentos para preencher o feed.
                </p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
                      <div>
                        <p>
                          <span className="font-medium">{a.member?.full_name ?? "Sistema"}</span>{" "}
                          <span className="text-muted-foreground">{describeActivity(a)}</span>
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelative(a.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próximos passos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>1. Cria os teus primeiros clientes em <strong className="text-foreground">Clientes</strong></li>
                <li>2. Adiciona tarefas em <strong className="text-foreground">Tarefas</strong> e usa o Kanban</li>
                <li>3. Convida membros em <strong className="text-foreground">Equipa</strong> (via Supabase Auth → trigger cria team_member)</li>
                <li>4. Configura templates de lançamento em <strong className="text-foreground">Configurações</strong></li>
                <li>5. Activa <strong className="text-foreground">Partilha</strong> em clientes para dashboards públicos</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
