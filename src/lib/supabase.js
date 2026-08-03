import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ""

let supabaseClient = null

export function getSupabase() {
  if (supabaseClient) return supabaseClient

  const missing = []
  if (!SUPABASE_URL) missing.push("VITE_SUPABASE_URL")
  if (!SUPABASE_ANON_KEY) missing.push("VITE_SUPABASE_ANON_KEY")

  if (missing.length > 0) {
    throw new Error(
      `Supabase is not configured. Missing environment variable(s): ${missing.join(
        ", "
      )}. Add them to your .env file and restart the dev server.`
    )
  }

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return supabaseClient
}

export async function verifySupabaseConnection() {
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from("_studybrain_health_check")
      .select("id")
      .limit(1)

    if (error) {
      const message = error.message || ""
      if (/invalid api key/i.test(message)) {
        throw new Error(
          "Supabase rejected the anon key (check VITE_SUPABASE_ANON_KEY)."
        )
      }
      if (!error.code || /fetch|network|econn|enotfound/i.test(message)) {
        throw new Error(message)
      }
    }

    console.log("✅ Supabase connected")
    return true
  } catch (err) {
    console.error("❌ Supabase connection failed:", err.message || err)
    return false
  }
}
