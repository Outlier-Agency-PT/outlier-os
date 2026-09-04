export const revalidate = 300;

import { PageHeader } from "@/components/layout/page-header";
import { ProcessesView } from "@/components/processes/processes-view";
import { getProcesses, getProcessCategories, searchProcessesSemantic, type ProcessWithSimilarity } from "@/lib/queries/processes";
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

  const useSemanticSearch = search.length >= 3;

  const [semanticResults, categories, members] = await Promise.all([
    useSemanticSearch ? searchProcessesSemantic(search) : null,
    getProcessCategories(),
    getTeamMembers(),
  ]);

  const isSemanticSearch = useSemanticSearch && semanticResults !== null;

  let processes;
  let similarityMap: Record<string, number> = {};

  if (useSemanticSearch) {
    if (semanticResults !== null) {
      processes = semanticResults;
    } else {
      processes = await getProcesses({ search });
    }
  } else {
    processes = await getProcesses({ search });
  }

  if (isSemanticSearch && semanticResults) {
    for (const p of semanticResults as ProcessWithSimilarity[]) {
      if (typeof p.similarity === "number") similarityMap[p.id] = p.similarity;
    }
  }

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
        isSemanticSearch={isSemanticSearch}
        similarityMap={similarityMap}
      />
    </>
  );
}
