import { PageHeader } from "@/components/layout/page-header";
import { ProcessesView } from "@/components/processes/processes-view";
import { getProcesses, getProcessCategories } from "@/lib/queries/processes";

export const dynamic = "force-dynamic";

export default async function ProcessosPage() {
  const [processes, categories] = await Promise.all([getProcesses(), getProcessCategories()]);

  return (
    <>
      <PageHeader
        title="Processos & SOPs"
        description={`${processes.length} ${processes.length === 1 ? "processo" : "processos"}`}
      />
      <ProcessesView processes={processes} categories={categories} />
    </>
  );
}
