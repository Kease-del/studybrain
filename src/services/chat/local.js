const SESSIONS_KEY = (email) => `studybrain_chat_sessions_v2_${email}`
const MESSAGES_KEY = (sessionId) => `studybrain_chat_msgs_${sessionId}`

const now = () => new Date().toISOString()

export const localChatProvider = {
  getSessions(email) {
    const raw = localStorage.getItem(SESSIONS_KEY(email))
    return raw ? JSON.parse(raw) : []
  },

  createSession(email, title = "New Chat") {
    const session = {
      id: crypto.randomUUID(),
      title,
      createdAt: now(),
      updatedAt: now(),
    }
    const list = this.getSessions(email)
    localStorage.setItem(SESSIONS_KEY(email), JSON.stringify([session, ...list]))
    return session
  },

  renameSession(email, id, title) {
    localStorage.setItem(
      SESSIONS_KEY(email),
      JSON.stringify(
        this.getSessions(email).map((s) =>
          s.id === id ? { ...s, title, updatedAt: now() } : s
        )
      )
    )
  },

  deleteSession(email, id) {
    localStorage.setItem(
      SESSIONS_KEY(email),
      JSON.stringify(this.getSessions(email).filter((s) => s.id !== id))
    )
    localStorage.removeItem(MESSAGES_KEY(id))
  },

  getMessages(email, sessionId) {
    const raw = localStorage.getItem(MESSAGES_KEY(sessionId))
    return raw ? JSON.parse(raw) : []
  },

  saveMessages(email, sessionId, messages) {
    localStorage.setItem(MESSAGES_KEY(sessionId), JSON.stringify(messages))
  },
}