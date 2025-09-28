import { createServerClient } from "@supabase/ssr"

type Supa = ReturnType<typeof createServerClient>
let _admin: Supa | null = null

export function getAdminSupabase() {
  if (_admin) return _admin
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  // Minimal cookies adapter for server-only usage
  _admin = createServerClient(url, key, {
    cookies: {
      get() {
        return ""
      },
      set() {},
      remove() {},
    },
  })
  return _admin
}
