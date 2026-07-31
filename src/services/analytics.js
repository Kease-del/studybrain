function sessionKey(email) {
  return `studybrain_chat_sessions_${email}`
}

function activeKey(email) {
  return `studybrain_chat_session_active_${email}`
}

export function getChatSessionCount(email) {
  if (!email) return 0
  try {
    const raw = localStorage.getItem(sessionKey(email))
    const n = parseInt(raw ?? "0", 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

export function trackChatMessage(email) {
  if (!email) return
  const active = localStorage.getItem(activeKey(email))
  if (active) return

  const count = getChatSessionCount(email) + 1
  localStorage.setItem(sessionKey(email), String(count))
  localStorage.setItem(activeKey(email), "true")
}

export function resetChatSession(email) {
  if (!email) return
  localStorage.removeItem(activeKey(email))
}

export function migrateChatSessions(email) {
  if (!email) return
  const oldKey = "studybrain_chat_sessions"
  const raw = localStorage.getItem(oldKey)
  if (raw === null) return

  const userKey_ = sessionKey(email)
  if (localStorage.getItem(userKey_) !== null) return

  localStorage.setItem(userKey_, raw)
  localStorage.removeItem(oldKey)

  const oldActive = "studybrain_chat_session_active"
  const activeRaw = localStorage.getItem(oldActive)
  if (activeRaw !== null) {
    localStorage.setItem(activeKey(email), activeRaw)
    localStorage.removeItem(oldActive)
  }
}
