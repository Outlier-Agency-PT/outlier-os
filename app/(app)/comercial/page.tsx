import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComercialDashboard } from "@/components/commercial/comercial-dashboard";
import { SyncComercialButton } from "@/components/commercial/sync-comercial-button";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function ComercialPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user?.id ?? "")
    .eq("active", true)
    .maybeSingle();

  if (!member || member.role !== "admin") {
    redirect("/dashboard");
  }

  const [closerRes, sdrRes, callsRes, metasRes, lossRes, vendasRes, closerServicosRes, sdrAllRes, bdrRes] = await Promise.all([
    supabase.from("commercial_closer_metrics").select("*").eq("funnel", "incubadora").eq("closer_name", "TOTAL").order("year").order("month_name"),
    supabase.from("commercial_sdr_metrics").select("*").eq("funnel", "incubadora").eq("sdr_name", "TOTAL").order("year").order("month_name"),
    supabase.from("commercial_call_tracking").select("*").order("year").order("month_name"),
    supabase.from("commercial_monthly_targets").select("*").order("year").order("month_name"),
    supabase.from("commercial_loss_reasons").select("*").order("role"),
    supabase.from("commercial_sales_by_funnel").select("*").order("month_name"),
    supabase.from("commercial_closer_metrics").select("*").eq("funnel", "servicos").eq("closer_name", "TOTAL").order("year").order("month_name"),
    supabase.from("commercial_sdr_metrics").select("*").eq("funnel", "incubadora").order("year").order("month_name"),
    supabase.from("commercial_bdr_metrics").select("*").order("year").order("month_name"),
  ]);

  return (
    <>
      <PageHeader
        title="Comercial"
        description="Métricas da equipa comercial"
        actions={<SyncComercialButton />}
      />
      <ComercialDashboard
        closerData={closerRes.data ?? []}
        closerServicosData={closerServicosRes.data ?? []}
        sdrData={sdrRes.data ?? []}
        sdrAllData={sdrAllRes.data ?? []}
        bdrData={bdrRes.data ?? []}
        callsData={callsRes.data ?? []}
        metasData={metasRes.data ?? []}
        lossData={lossRes.data ?? []}
        vendasData={vendasRes.data ?? []}
      />
    </>
  );
}
