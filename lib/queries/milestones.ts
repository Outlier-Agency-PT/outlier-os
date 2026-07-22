import { createClient } from "@/lib/supabase/server";

export interface JourneyMilestone {
  key: string;
  label: string;
  icon: string;
  achieved_at: string;
}

export async function getStudentJourneyMilestones(studentId: string): Promise<JourneyMilestone[]> {
  const supabase = await createClient();

  const [
    { data: student },
    { data: briefing },
    { data: revenueHistory },
    { data: firstLaunch },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("investment_budget, sales_page_published_at, renewal_decided_at")
      .eq("id", studentId)
      .maybeSingle(),
    supabase
      .from("student_briefings")
      .select("updated_at")
      .eq("student_id", studentId)
      .eq("is_complete", true)
      .maybeSingle(),
    supabase
      .from("student_revenue_history")
      .select("value, recorded_at")
      .eq("student_id", studentId)
      .gt("value", 0)
      .order("recorded_at", { ascending: true }),
    supabase
      .from("student_launches")
      .select("completed_at")
      .eq("student_id", studentId)
      .eq("status", "concluido")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const milestones: JourneyMilestone[] = [];
  const s = student as Record<string, unknown> | null;
  const history = (revenueHistory ?? []) as { value: number; recorded_at: string }[];

  // 1. Produto definido — briefing completo
  if (briefing?.updated_at) {
    milestones.push({
      key: "product_defined",
      label: "Produto Definido",
      icon: "📋",
      achieved_at: briefing.updated_at as string,
    });
  }

  // 2. Página no ar
  if (s?.sales_page_published_at) {
    milestones.push({
      key: "page_live",
      label: "Página no Ar",
      icon: "🌐",
      achieved_at: s.sales_page_published_at as string,
    });
  }

  // 3. Primeira venda
  if (history.length > 0) {
    milestones.push({
      key: "first_sale",
      label: "Primeira Venda",
      icon: "💰",
      achieved_at: history[0].recorded_at,
    });
  }

  // 4. Lançamento concluído
  const launch = firstLaunch as { completed_at: string } | null;
  if (launch?.completed_at) {
    milestones.push({
      key: "first_launch",
      label: "Lançamento Concluído",
      icon: "🚀",
      achieved_at: launch.completed_at,
    });
  }

  // 5. ROI positivo — primeiro momento em que receita acumulada >= investimento
  const budget = s?.investment_budget as number | null;
  if (budget && budget > 0 && history.length > 0) {
    let accumulated = 0;
    for (const entry of history) {
      accumulated += Number(entry.value);
      if (accumulated >= budget) {
        milestones.push({
          key: "roi_positive",
          label: "ROI Positivo",
          icon: "📈",
          achieved_at: entry.recorded_at,
        });
        break;
      }
    }
  }

  // 6. Renovação decidida
  if (s?.renewal_decided_at) {
    milestones.push({
      key: "renewal_decided",
      label: "Renovação Decidida",
      icon: "🔄",
      achieved_at: s.renewal_decided_at as string,
    });
  }

  return milestones.sort(
    (a, b) => new Date(a.achieved_at).getTime() - new Date(b.achieved_at).getTime(),
  );
}
