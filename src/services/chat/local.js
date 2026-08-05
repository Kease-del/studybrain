const SESSIONS_KEY = (email) => `studybrain_chat_sessions_v2_${email}`
const MESSAGES_KEY = (sessionId) => `studybrain_chat_msgs_${sessionId}`

const now = () => new Date().toISOString()

const emailOf = (user) => user?.email

export const localChatProvider = {
  getSessions(user) {
    const email = emailOf(user)
    if (!email) return []
    const raw = localStorage.getItem(SESSIONS_KEY(email))
    if (!raw) return []
    return JSON.parse(raw).map((s) => ({ ...s, summary: s.summary ?? "" }))
  },

  createSession(user, title = "New Chat") {
    const email = emailOf(user)
    if (!email) return null
    const session = {
      id: crypto.randomUUID(),
      title,
      summary: "",
      createdAt: now(),
      updatedAt: now(),
    }
    const list = this.getSessions(user)
    localStorage.setItem(SESSIONS_KEY(email), JSON.stringify([session, ...list]))
    return session
  },

  getSummary(user, sessionId) {
    const s = this.getSessions(user).find((x) => x.id === sessionId)
    return s?.summary ?? ""
  },

  saveSummary(user, sessionId, summary) {
    const email = emailOf(user)
    if (!email) return
    localStorage.setItem(
      SESSIONS_KEY(email),
      JSON.stringify(
        this.getSessions(user).map((s) =>
          s.id === sessionId ? { ...s, summary } : s
        )
      )
    )
  },

  renameSession(user, id, title) {
    const email = emailOf(user)
    if (!email) return
    localStorage.setItem(
      SESSIONS_KEY(email),
      JSON.stringify(
        this.getSessions(user).map((s) =>
          s.id === id ? { ...s, title, updatedAt: now() } : s
        )
      )
    )
  },

  deleteSession(user, id) {
    const email = emailOf(user)
    if (!email) return
    localStorage.setItem(
      SESSIONS_KEY(email),
      JSON.stringify(this.getSessions(user).filter((s) => s.id !== id))
    )
    localStorage.removeItem(MESSAGES_KEY(id))
  },

  getMessages(user, sessionId) {
    const raw = localStorage.getItem(MESSAGES_KEY(sessionId))
    return raw ? JSON.parse(raw) : []
  },

  saveMessages(user, sessionId, messages) {
    localStorage.setItem(MESSAGES_KEY(sessionId), JSON.stringify(messages))
  },
}
