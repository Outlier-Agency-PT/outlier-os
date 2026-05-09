import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Carregar perfil do team_member
  const { data: member } = await supabase
    .from("team_members")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen">
      <Sidebar
        userEmail={member?.email ?? user.email ?? undefined}
        userName={member?.full_name ?? undefined}
      />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
