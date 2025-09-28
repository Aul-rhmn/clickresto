import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

let _serverSupabase: ReturnType<typeof createServerClient> | null = null

export function getServerSupabase() {
  if (_serverSupabase) return _serverSupabase
  // IMPORTANT: server-only. Uses Service Role when available for privileged ops (e.g., Storage, RLS-bypassing inserts via RPC if needed).
  // Default to ANON if SERVICE_ROLE is not desired in a given route.
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!

  _serverSupabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookies().getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookies().set(name, value, options))
        } catch {
          // no-op in route handlers without response context
        }
      },
    },
  })
  return _serverSupabase
}
