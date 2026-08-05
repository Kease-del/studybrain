import { getSupabase } from "@/lib/supabase"

const SESSIONS_TABLE = "chat_sessions"
const MESSAGES_TABLE = "chat_messages"

const requireUserId = (user) => {
  if (!user?.id) {
    throw new Error(
      "Supabase chat requires a Supabase auth session (set VITE_AUTH_PROVIDER=supabase)."
    )
  }
  return user.id
}

const mapSession = (row) => ({
  id: row.id,
  title: row.title,
  summary: row.summary ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapMessage = (row) => ({
  id: row.id,
  role: row.role,
  content: row.content,
  metadata: row.metadata ?? undefined,
  createdAt: row.created_at,
})

export const supabaseChatProvider = {
  async getSessions(user) {
    const userId = requireUserId(user)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from(SESSIONS_TABLE)
      .select("id, title, summary, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(mapSession)
  },

  async createSession(user, title = "New Chat") {
    const userId = requireUserId(user)
    const session = {
      id: crypto.randomUUID(),
      title,
      summary: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const supabase = getSupabase()
    const { error } = await supabase.from(SESSIONS_TABLE).insert({
      id: session.id,
      user_id: userId,
      title: session.title,
      summary: session.summary,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    })
    if (error) throw new Error(error.message)
    return session
  },

  async getSummary(user, sessionId) {
    const userId = requireUserId(user)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from(SESSIONS_TABLE)
      .select("summary")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data?.summary ?? ""
  },

  async saveSummary(user, sessionId, summary) {
    requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase
      .from(SESSIONS_TABLE)
      .update({ summary })
      .eq("id", sessionId)
    if (error) throw new Error(error.message)
  },

  async renameSession(user, id, title) {
    requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase
      .from(SESSIONS_TABLE)
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw new Error(error.message)
  },

  async deleteSession(user, id) {
    requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase
      .from(SESSIONS_TABLE)
      .delete()
      .eq("id", id)
    if (error) throw new Error(error.message)
  },

  async getMessages(user, sessionId) {
    requireUserId(user)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from(MESSAGES_TABLE)
      .select("id, role, content, metadata, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)
    return (data || []).map(mapMessage)
  },

  async saveMessages(user, sessionId, messages) {
    requireUserId(user)
    const supabase = getSupabase()
    const { error: deleteError } = await supabase
      .from(MESSAGES_TABLE)
      .delete()
      .eq("session_id", sessionId)
    if (deleteError) throw new Error(deleteError.message)
    if (messages.length === 0) return
    const { error } = await supabase.from(MESSAGES_TABLE).insert(
      messages.map((m) => ({
        id: m.id,
        session_id: sessionId,
        role: m.role,
        content: m.content,
        metadata: m.metadata ?? {},
        created_at: m.createdAt,
      }))
    )
    if (error) throw new Error(error.message)
  },
}
