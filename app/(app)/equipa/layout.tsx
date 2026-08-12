import { createClient } from "@/lib/supabase/server";
import { EquipaTabs } from "@/components/team/equipa-tabs";

export default async function EquipaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const isAdmin = member?.role === "admin";

  return (
    <>
      <EquipaTabs isAdmin={isAdmin} />
      {children}
    </>
  );
}
