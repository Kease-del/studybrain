import { tokenise, FIELD_WEIGHTS } from "./retriever.js"

const MAX_NOTES = 5

function searchableFields(note) {
  const fields = []
  if (note.title) {
    fields.push({ field: "title", value: note.title })
  }
  if (note.text) {
    fields.push({ field: "text", value: note.text })
  }
  return fields
}

function scoreNote(keywords, note) {
  let score = 0
  const matchedFields = []
  for (const { field, value } of searchableFields(note)) {
    const lower = value.toLowerCase()
    const matching = keywords.filter((kw) => lower.includes(kw))
    if (matching.length === 0) continue
    const weight = FIELD_WEIGHTS[field] ?? 1
    score += weight * matching.length
    matchedFields.push(field)
  }
  return { score, matchedFields }
}

export function retrieveNotes(query, notes) {
  if (!query || typeof query !== "string" || !query.trim()) return []
  const keywords = tokenise(query)
  if (keywords.length === 0) return []

  const results = []
  for (const note of notes ?? []) {
    if (!note?.id) continue
    const { score, matchedFields } = scoreNote(keywords, note)
    if (score > 0) {
      results.push({ id: note.id, note, score, matchedFields })
    }
  }

  results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return results.slice(0, MAX_NOTES)
}
