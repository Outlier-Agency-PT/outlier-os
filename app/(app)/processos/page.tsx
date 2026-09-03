export const revalidate = 300;

import { PageHeader } from "@/components/layout/page-header";
import { ProcessesView } from "@/components/processes/processes-view";
import { getProcesses, getProcessCategories } from "@/lib/queries/processes";
import { getTeamMembers } from "@/lib/queries/team";

export const dynamic = "force-dynamic";

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; subcategory?: string }>;
}) {
  const { search: searchParam, category, subcategory } = await searchParams;
  const search = searchParam ?? "";
  const categoryId = category ?? null;
  const subcategoryFilter = subcategory ?? null;

  const [processes, categories, members] = await Promise.all([
    getProcesses({ search }),
    getProcessCategories(),
    getTeamMembers(),
  ]);

  const displayCount = categoryId
    ? processes.filter((p) => p.category_id === categoryId).length
    : processes.length;

  return (
    <>
      <PageHeader
        title="Processos & SOPs"
        description={`${displayCount} ${displayCount === 1 ? "processo" : "processos"}`}
      />
      <ProcessesView
        processes={processes}
        categories={categories}
        members={members}
        search={search}
        categoryId={categoryId}
        subcategoryFilter={subcategoryFilter}
      />
    </>
  );
}
