import { redirect } from "next/navigation";
import { getUserRoles, getHomeRoute } from "@/lib/supabase/roles";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const roles = await getUserRoles();
  if (!roles.includes("admin") && !roles.includes("funcionario")) {
    redirect(getHomeRoute(roles));
  }
  return <>{children}</>;
}
