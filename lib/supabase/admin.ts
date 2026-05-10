import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente Supabase com service_role — BYPASSA RLS.
// USA APENAS em rotas server-side onde o acesso é validado por outros meios
// (ex: /share/[token] valida o token e só depois chama queries).
// NUNCA expor em código que vá para o browser.

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
