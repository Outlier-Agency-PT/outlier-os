import { createBrowserClient } from "@supabase/ssr";

// NOTA: usamos cliente sem tipo Database até gerar tipos reais do schema com:
//   npx supabase gen types typescript --project-id <ref> > types/database.ts
// Depois trocar para createBrowserClient<Database>(...) e importar o tipo.

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
