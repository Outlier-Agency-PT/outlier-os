import { PageHeader } from "@/components/layout/page-header";
import { ProcessesView } from "@/components/processes/processes-view";
import { getProcesses, getProcessCategories } from "@/lib/queries/processes";
import { getTeamMembers } from "@/lib/queries/team";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}) {
  const { page: pageParam, search: searchParam, category } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const search = searchParam ?? "";
  const categoryId = category ?? null;

  const [{ data: processes, total }, categories, members] = await Promise.all([
    getProcesses({ page, pageSize: PAGE_SIZE, search, categoryId }),
    getProcessCategories(),
    getTeamMembers(),
  ]);

  return (
    <>
      <PageHeader
        title="Processos & SOPs"
        description={`${total} ${total === 1 ? "processo" : "processos"}`}
      />
      <ProcessesView
        processes={processes}
        categories={categories}
        members={members}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        search={search}
        categoryId={categoryId}
      />
    </>
  );
}
