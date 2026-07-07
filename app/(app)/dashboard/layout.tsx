import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (member?.role !== "admin" && member?.role !== "membro") {
    redirect("/incubadora");
  }

  return <>{children}</>;
}
