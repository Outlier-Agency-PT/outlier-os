import { redirect } from "next/navigation";
import { getUserRoles, getHomeRoute } from "@/lib/supabase/roles";

export default async function EscolherLayout({ children }: { children: React.ReactNode }) {
  const roles = await getUserRoles();
  const hasBothAluno =
    roles.includes("aluno_incubadora") && roles.includes("aluno_mentoria");
  if (!hasBothAluno && !roles.includes("admin")) {
    redirect(getHomeRoute(roles));
  }
  return <>{children}</>;
}
