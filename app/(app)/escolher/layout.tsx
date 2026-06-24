import { redirect } from "next/navigation";
import { getUserRoles, getHomeRoute } from "@/lib/supabase/roles";

export default async function EscolherLayout({ children }: { children: React.ReactNode }) {
  const roles = await getUserRoles();
  const isAluno = roles.includes("aluno");
  if (!isAluno && !roles.includes("admin")) {
    redirect(getHomeRoute(roles));
  }
  return <>{children}</>;
}
