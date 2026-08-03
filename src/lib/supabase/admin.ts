import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client com a service role key — só usar em Server Actions / Route Handlers,
 * nunca importar em código que roda no browser. A autorização aqui é feita
 * pela nossa própria sessão (cookie httpOnly), não pelo Supabase Auth, então
 * esse client ignora RLS por design.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
