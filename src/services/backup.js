const APP_NAME = "StudyBrain"
const APP_VERSION = "0.0.0"

function userKey(prefix, email) {
  return `${prefix}_${email}`
}

export function exportData(email) {
  const notes = readJSON(userKey("studybrain_notes", email), [])
  const vault = readJSON(userKey("studybrain_vault", email), [])
  const goals = readJSON(userKey("studybrain_goals", email), [])
  const chat = readJSON(userKey("studybrain_chat", email), [])
  const theme =
    localStorage.getItem(userKey("studybrain_theme", email)) ||
    localStorage.getItem("studybrain_theme") ||
    "system"
  const chatSessions = parseInt(
    localStorage.getItem(userKey("studybrain_chat_sessions", email)) ?? "0",
    10
  )

  return {
    app: APP_NAME,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      notes,
      vault,
      goals,
      chat,
      settings: { theme },
      analytics: { chatSessions: Number.isFinite(chatSessions) ? Math.max(0, chatSessions) : 0 },
    },
  }
}

export function downloadBackup(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `studybrain-backup-${data.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function validateBackup(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid backup file. The file does not contain a valid JSON object." }
  }

  if (data.app !== APP_NAME) {
    return { valid: false, error: `This file was not created by ${APP_NAME}.` }
  }

  if (data.version !== APP_VERSION) {
    return { valid: true, warning: `Backup was created by a different version (${data.version || "unknown"}). Some data may not be fully compatible.` }
  }

  if (!data.data || typeof data.data !== "object") {
    return { valid: false, error: "Backup file is missing data section." }
  }

  return { valid: true }
}

export function importData(data, email) {
  const { data: payload } = data

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  }

  if (payload.notes) {
    write(userKey("studybrain_notes", email), payload.notes)
  }
  if (payload.vault) {
    write(userKey("studybrain_vault", email), payload.vault)
  }
  if (payload.goals) {
    write(userKey("studybrain_goals", email), payload.goals)
  }
  if (payload.chat) {
    write(userKey("studybrain_chat", email), payload.chat)
  }
  if (payload.settings?.theme) {
    localStorage.setItem(userKey("studybrain_theme", email), payload.settings.theme)
  }
  if (payload.analytics?.chatSessions !== undefined) {
    localStorage.setItem(
      userKey("studybrain_chat_sessions", email),
      String(payload.analytics.chatSessions)
    )
  }
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
