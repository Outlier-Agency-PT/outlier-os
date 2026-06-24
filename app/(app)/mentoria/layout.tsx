import { redirect } from "next/navigation";
import { getUserRoles, getHomeRoute } from "@/lib/supabase/roles";

export default async function MentoriaLayout({ children }: { children: React.ReactNode }) {
  const roles = await getUserRoles();
  if (!roles.includes("admin") && !roles.includes("aluno")) {
    redirect(getHomeRoute(roles));
  }
  return <>{children}</>;
}
