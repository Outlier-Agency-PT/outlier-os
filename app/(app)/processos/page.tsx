import { PageHeader } from "@/components/layout/page-header";
import { ProcessesView } from "@/components/processes/processes-view";
import { getProcesses, getProcessCategories } from "@/lib/queries/processes";
import { getTeamMembers } from "@/lib/queries/team";

export const dynamic = "force-dynamic";

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const { search: searchParam, category } = await searchParams;
  const search = searchParam ?? "";
  const categoryId = category ?? null;

  const [processes, categories, members] = await Promise.all([
    getProcesses({ search, categoryId }),
    getProcessCategories(),
    getTeamMembers(),
  ]);

  return (
    <>
      <PageHeader
        title="Processos & SOPs"
        description={`${processes.length} ${processes.length === 1 ? "processo" : "processos"}`}
      />
      <ProcessesView
        processes={processes}
        categories={categories}
        members={members}
        search={search}
        categoryId={categoryId}
      />
    </>
  );
}
