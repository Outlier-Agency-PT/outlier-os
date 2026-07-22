import { getWhiteboards } from "@/lib/queries/whiteboards";
import { WhiteboardList } from "@/components/whiteboard/whiteboard-list";
import { PageHeader } from "@/components/layout/page-header";
import { getUserRoles } from "@/lib/supabase/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WhiteboardPage() {
  const roles = await getUserRoles();
  const isStaff =
    roles.includes("admin") || roles.includes("funcionario");

  if (!isStaff) redirect("/dashboard");

  const isAdmin = roles.includes("admin");
  const whiteboards = await getWhiteboards();

  return (
    <>
      <PageHeader
        title="Whiteboards"
        description={`${whiteboards.length} board${whiteboards.length !== 1 ? "s" : ""}`}
      />
      <WhiteboardList whiteboards={whiteboards} isAdmin={isAdmin} />
    </>
  );
}
