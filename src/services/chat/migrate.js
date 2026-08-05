import { getSupabase } from "@/lib/supabase"
import { localChatProvider } from "./local"

const MIGRATED_KEY = (email) => `studybrain_chat_migrated_${email}`

export async function migrateLocalChatToSupabase(user) {
  if (!user?.id || !user.email) return { migrated: false }

  if (localStorage.getItem(MIGRATED_KEY(user.email))) {
    return { migrated: false }
  }

  const sessions = localChatProvider.getSessions(user)
  if (sessions.length === 0) {
    localStorage.setItem(MIGRATED_KEY(user.email), "true")
    return { migrated: false }
  }

  const supabase = getSupabase()

  for (const session of sessions) {
    const messages = localChatProvider.getMessages(user, session.id)

    const { error: sessionError } = await supabase
      .from("chat_sessions")
      .upsert(
        {
          id: session.id,
          user_id: user.id,
          title: session.title,
          summary: session.summary ?? "",
          created_at: session.createdAt,
          updated_at: session.updatedAt,
        },
        { onConflict: "id" }
      )
    if (sessionError) throw new Error(sessionError.message)

    if (messages.length > 0) {
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .upsert(
          messages.map((m) => ({
            id: m.id,
            session_id: session.id,
            role: m.role,
            content: m.content,
            metadata: m.metadata ?? {},
            created_at: m.createdAt,
          })),
          { onConflict: "id" }
        )
      if (messagesError) throw new Error(messagesError.message)
    }
  }

  localStorage.setItem(MIGRATED_KEY(user.email), "true")
  return { migrated: true, sessionCount: sessions.length }
}
