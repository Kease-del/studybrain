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

/**
 * Decides whether a conversation should be summarized. When the number of
 * messages exceeds `trigger`, everything except the newest `recentToKeep`
 * messages is eligible for summarization. Returns null when the threshold has
 * not been reached (or when there is nothing to summarize).
 */
export function partitionMessagesForSummary(messages, trigger = 30, recentToKeep = 12) {
  const list = (messages ?? []).filter(
    (m) => typeof m.content === "string" && m.content.trim().length > 0
  )
  if (list.length <= trigger) return null
  const keepFrom = list.length - recentToKeep
  if (keepFrom <= 0) return null
  return {
    toSummarize: list.slice(0, keepFrom),
    keep: list.slice(keepFrom),
  }
}
