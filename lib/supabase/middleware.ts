import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login");
  const isPublicShare = pathname.startsWith("/share");

  // Sem user → /login
  if (!user && !isAuthRoute && !isPublicShare && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Com user autenticado → verificar role e redirecionar se necessário
  if (user) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleList = (roles ?? []).map((r) => r.role);
    const isAdmin = roleList.includes("admin");
    const isFuncionario = roleList.includes("funcionario");
    const isAluno = roleList.includes("aluno");

    // Determinar rota correcta para este utilizador
    let correctRoute = "/dashboard"; // default
    if (isAluno && !isAdmin && !isFuncionario) {
      correctRoute = "/incubadora";
    }

    // Se está em /login, redirecionar para a rota correcta
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = correctRoute;
      return NextResponse.redirect(url);
    }

    // Se é aluno, só pode aceder a /incubadora
    if (isAluno && !isAdmin && !isFuncionario) {
      if (!pathname.startsWith("/incubadora")) {
        const url = request.nextUrl.clone();
        url.pathname = "/incubadora";
        return NextResponse.redirect(url);
      }
    }
    // Admin e funcionário podem aceder a qualquer rota sem redirect
  }

  return supabaseResponse;
}
