import { PageHeader } from "@/components/layout/page-header";
import { OkrsView } from "@/components/okrs/okrs-view";
import { getObjectives } from "@/lib/queries/okrs";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; y?: string }>;
}

function currentQuarter() {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return "Q1";
  if (m <= 6) return "Q2";
  if (m <= 9) return "Q3";
  return "Q4";
}

export default async function OkrsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const quarter = (params.q as "Q1" | "Q2" | "Q3" | "Q4") ?? currentQuarter();
  const year = params.y ? Number(params.y) : new Date().getFullYear();

  const objectives = await getObjectives({ quarter, year });

  return (
    <>
      <PageHeader
        title="OKRs"
        description={`${objectives.length} ${objectives.length === 1 ? "objetivo" : "objetivos"} · ${quarter} ${year}`}
      />
      <OkrsView objectives={objectives} selectedQuarter={quarter} selectedYear={year} />
    </>
  );
}
