const SAVE_VERBS = "(?:sav(?:e|ed|es)?|stor(?:e|ed|es)?|add(?:s|ed)?|put|wrot(?:e|ten)|writ(?:e|es|ten))"

const NOTES_WORD = /\bnotes?\b/
const VAULT_WORDS = /\b(?:vault|resources?|documents?|docs?|pdfs?|files?|bookmarks?)\b/

/**
 * Detects which part of the knowledge base the query is about.
 *
 * - "notes"   → the Notes page (note text)
 * - "vault"   → resources/documents in the Vault
 * - "both"    → the query references both, or is generic about "saved knowledge"
 *
 * @param {string} query
 * @returns {"notes"|"vault"|"both"}
 */
export function getKnowledgeDomain(query) {
  const t = (query || "").toLowerCase().trim()
  const wantsNotes = NOTES_WORD.test(t)
  const wantsVault = VAULT_WORDS.test(t)
  if (wantsNotes && wantsVault) return "both"
  if (wantsNotes) return "notes"
  if (wantsVault) return "vault"
  return "both"
}

export function isAskingAboutKnowledge(query) {
  const t = (query || "").toLowerCase().trim()

  if (/\bmy\s+(?:saved\s+)?(?:notes?|vault|resources?|documents?|docs?|pdfs?|files?|knowledge(?:\s+base)?|bookmarks?)\b/.test(t)) return true

  if (/\b(?:the|this|that|your)\s+(?:documents?|pdfs?|resources?|files?|notes?|vault|bookmarks?)\b/.test(t)) return true

  if (new RegExp(`\\b(?:do i have|did i ${SAVE_VERBS}|have i ${SAVE_VERBS}|what.*i ${SAVE_VERBS})\\b`).test(t)) return true

  if (new RegExp(`\\b(?:everything|all)\\b[^.\\n]{0,30}\\bi\\s+${SAVE_VERBS}\\b`).test(t)) return true
  if (new RegExp(`\\bi\\s+${SAVE_VERBS}\\b[^.\\n]{0,30}\\b(?:everything|all)\\b`).test(t)) return true

  if (/\b(?:based on|from|in)\s+my\s+(?:notes?|vault|resources?|documents?|knowledge(?:\s+base)?)\b/.test(t)) return true

  if (/\bsaved\s+knowledge\b/.test(t)) return true

  return false
}
