import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Users, CheckSquare, Rocket, Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Carregar IDs de estados em paralelo (depende do seed estar aplicado)
  const [taskClosedRes, launchClosedRes, clientActiveRes] = await Promise.all([
    supabase.from("task_statuses").select("id").eq("key", "concluido").maybeSingle(),
    supabase.from("launch_statuses").select("id").in("key", ["concluido", "cancelado"]),
    supabase.from("client_statuses").select("id").eq("key", "ativo").maybeSingle(),
  ]);

  // Contagens em paralelo, com fallback se status não existirem
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

  const kpis = [
    { label: "Clientes Ativos", value: clientesRes.count ?? 0, icon: Users, tone: "text-blue-500" },
    { label: "Tarefas Abertas", value: tarefasRes.count ?? 0, icon: CheckSquare, tone: "text-orange-500" },
    { label: "Lançamentos Ativos", value: lancamentosRes.count ?? 0, icon: Rocket, tone: "text-purple-500" },
    { label: "Progresso OKRs", value: "—", icon: Target, tone: "text-green-500" },
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
              <p className="text-sm text-muted-foreground">
                Sem actividade ainda. Quando criares clientes, tarefas ou lançamentos, aparecem aqui.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progresso da Equipa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gráficos disponíveis após terem dados de tarefas concluídas no período.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
