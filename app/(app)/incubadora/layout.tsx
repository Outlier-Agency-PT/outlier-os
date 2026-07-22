import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentLayout } from "@/components/incubadora/student-layout";

export default async function IncubadoraLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: student }, { data: teamMember }] = await Promise.all([
    supabase.from("students").select("name, email").eq("user_id", user.id).maybeSingle(),
    supabase.from("team_members").select("role").eq("id", user.id).maybeSingle(),
  ]);

  const isStudent = !!student;
  const teamRole = teamMember?.role as string | undefined;
  const isStaff = teamRole === "admin" || teamRole === "membro";

  if (!isStudent && !isStaff) {
    redirect("/dashboard");
  }

  if (isStudent && !isStaff) {
    return (
      <StudentLayout
        userName={student.name ?? undefined}
        userEmail={student.email ?? user.email ?? undefined}
      >
        {children}
      </StudentLayout>
    );
  }

  return <>{children}</>;
}
