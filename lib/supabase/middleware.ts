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
  const isConvite = pathname.startsWith("/convite");
  const isCronRoute = pathname.startsWith("/api/cron/");
  const isSyncRoute = pathname.startsWith("/api/sync-sheets");

  // Emails de convite com token_hash a chegar a /login em vez de /convite
  // (acontece quando o NEXT_PUBLIC_APP_URL não estava definido em Vercel)
  if (isAuthRoute && request.nextUrl.searchParams.get("type") === "invite") {
    const url = request.nextUrl.clone();
    url.pathname = "/convite";
    return NextResponse.redirect(url);
  }

  // Sem user → /login
  if (!user && !isAuthRoute && !isPublicShare && !isConvite && !isCronRoute && !isSyncRoute && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Com user autenticado → verificar em que tabela existe e redirecionar
  if (user) {
    const [{ data: student }, { data: teamMember }] = await Promise.all([
      supabase
        .from("students")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("team_members")
        .select("id")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const isStudent = !!student;
    const isTeamMember = !!teamMember;

    // Determinar rota correcta para este utilizador
    let correctRoute: string;
    if (isTeamMember) {
      correctRoute = "/dashboard";
    } else if (isStudent) {
      correctRoute = "/incubadora";
    } else {
      // Utilizador autenticado mas sem perfil ainda (ex: a meio do fluxo de convite).
      // Permitir /convite e /login para evitar redirect loop — o utilizador pode estar
      // a completar o registo via verifyOtp antes de ter um perfil em team_members/students.
      if (!isConvite && !isAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Se está em /login, redirecionar para a rota correcta
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = correctRoute;
      return NextResponse.redirect(url);
    }

    // Se é aluno, só pode aceder a /incubadora e /api
    if (isStudent && !isTeamMember) {
      if (!pathname.startsWith("/incubadora") && !pathname.startsWith("/api")) {
        const url = request.nextUrl.clone();
        url.pathname = "/incubadora";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
