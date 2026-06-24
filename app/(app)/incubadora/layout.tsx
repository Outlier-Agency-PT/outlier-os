import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRoles, getHomeRoute } from "@/lib/supabase/roles";
import { StudentLayout } from "@/components/incubadora/student-layout";

export default async function IncubadoraLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const roles = await getUserRoles();
  if (!roles.includes("admin") && !roles.includes("aluno")) {
    redirect(getHomeRoute(roles));
  }

  const isAluno = roles.includes("aluno") && !roles.includes("admin") && !roles.includes("funcionario");

  if (isAluno) {
    const { data: member } = await supabase
      .from("team_members")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    return (
      <StudentLayout
        userName={member?.full_name ?? undefined}
        userEmail={member?.email ?? user.email ?? undefined}
      >
        {children}
      </StudentLayout>
    );
  }

  return <>{children}</>;
}
