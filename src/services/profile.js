import { getSupabase } from "@/lib/supabase"

export async function ensureProfile(user) {
  if (!user?.id) {
    throw new Error("Cannot create profile: missing user id")
  }

  const supabase = getSupabase()
  const now = new Date().toISOString()
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      name: user.name,
      created_at: now,
      updated_at: now,
    },
    { onConflict: "id", ignoreDuplicates: true }
  )

  if (error) throw error
}
