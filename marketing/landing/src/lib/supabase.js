import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL || ""
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ""

let client = null

export function getSupabase() {
  if (client) return client

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file and restart the dev server."
    )
  }

  client = createClient(url, anonKey)
  return client
}
