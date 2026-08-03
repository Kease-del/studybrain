import { getSupabase } from "@/lib/supabase"

const TABLE = "notes"
const TITLE_MAX = 80

const requireUserId = (user) => {
  if (!user?.id) {
    throw new Error(
      "Supabase notes require a Supabase auth session (set VITE_AUTH_PROVIDER=supabase)."
    )
  }
  return user.id
}

const deriveTitle = (text) => {
  const firstLine = (text || "").split("\n").find((line) => line.trim()) || ""
  const trimmed = firstLine.trim()
  if (!trimmed) return "Untitled"
  if (trimmed.length <= TITLE_MAX) return trimmed
  return trimmed.slice(0, TITLE_MAX).trimEnd() + "…"
}

const mapRow = (row) => ({
  id: row.id,
  title: row.title,
  text: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const supabaseNotesProvider = {
  async fetchNotes(user) {
    const userId = requireUserId(user)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, title, content, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(mapRow)
  },

  async addNote(user, note) {
    const userId = requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase.from(TABLE).insert({
      id: note.id,
      user_id: userId,
      title: deriveTitle(note.text),
      content: note.text,
      created_at: note.createdAt,
      updated_at: note.createdAt,
    })
    if (error) throw new Error(error.message)
  },

  async updateNote(user, note) {
    requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase
      .from(TABLE)
      .update({
        title: deriveTitle(note.text),
        content: note.text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", note.id)
    if (error) throw new Error(error.message)
  },

  async deleteNote(user, noteId) {
    requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase.from(TABLE).delete().eq("id", noteId)
    if (error) throw new Error(error.message)
  },
}
