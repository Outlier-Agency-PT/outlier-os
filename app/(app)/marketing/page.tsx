import { createClient } from "@/lib/supabase/server";
import { MarketingDashboard } from "@/components/marketing/marketing-dashboard";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const supabase = await createClient();

  const [mensalRes, semanalRes, roasRes] = await Promise.all([
    supabase.from("marketing_funnel_monthly").select("*").order("year").order("month_name"),
    supabase.from("marketing_funnel_weekly").select("*").order("year").order("week_start"),
    supabase.from("marketing_roas_monthly").select("*").order("year").order("month_name"),
  ]);

  return (
    <>
      <PageHeader
        title="Marketing"
        description="Dashboard de marketing e funis de tráfego pago"
      />
      <div className="p-6">
        <MarketingDashboard
          mensalData={mensalRes.data ?? []}
          semanalData={semanalRes.data ?? []}
          roasData={roasRes.data ?? []}
        />
      </div>
    </>
  );
}
