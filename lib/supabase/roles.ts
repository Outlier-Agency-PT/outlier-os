import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "funcionario" | "aluno";

export async function getUserRoles(): Promise<AppRole[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  return (data ?? []).map((r) => r.role as AppRole);
}

// Calcula a rota correcta para um utilizador com base nos seus roles.
// Usada nos redirects de acesso negado para nunca mostrar 403.
export function getHomeRoute(roles: AppRole[]): string {
  if (roles.includes("admin") || roles.includes("funcionario")) return "/dashboard";
  if (roles.includes("aluno")) return "/incubadora";
  return "/dashboard";
}
