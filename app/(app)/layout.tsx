import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/supabase/roles";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const roles = await getUserRoles();
  const isAluno = roles.includes("aluno") && !roles.includes("admin") && !roles.includes("funcionario");

  if (isAluno) {
    return <>{children}</>;
  }

  const { data: member } = await supabase
    .from("team_members")
    .select("full_name, email, role, permissions_modules")
    .eq("id", user.id)
    .single();

  return (
    <AppShell
      userEmail={member?.email ?? user.email ?? undefined}
      userName={member?.full_name ?? undefined}
      role={member?.role}
      permissionsModules={member?.permissions_modules ?? []}
    >
      {children}
    </AppShell>
  );
}
