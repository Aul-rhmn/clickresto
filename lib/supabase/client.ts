"use client"

import { createBrowserClient } from "@supabase/ssr"

let _browserSupabase: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserSupabase() {
  if (_browserSupabase) return _browserSupabase
  _browserSupabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return _browserSupabase
}
