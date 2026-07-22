import { createClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/supabase/roles";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StudentSupportDashboard } from "@/components/students/student-support-dashboard";

export const dynamic = "force-dynamic";

export default async function SupportePage() {
  const supabase = await createClient();
  const roles = await getUserRoles();

  const isStaff =
    roles.includes("admin") || roles.includes("funcionario");

  if (!isStaff) {
    redirect("/incubadora");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader
        title="Suporte"
        description="Tickets de dúvidas dos alunos da Incubadora"
      />
      <div className="p-8">
        <StudentSupportDashboard />
      </div>
    </>
  );
}
