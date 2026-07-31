const MAX_HISTORY_MESSAGES = 12
const MAX_HISTORY_CHARS = 10000

export function trimHistory(messages) {
  if (!messages || messages.length === 0) return messages

  const result = []
  let chars = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    const len = m.content?.length ?? 0

    if (result.length >= MAX_HISTORY_MESSAGES) break
    if (result.length > 0 && chars + len > MAX_HISTORY_CHARS) break

    result.unshift(m)
    chars += len
  }

  return result
}
