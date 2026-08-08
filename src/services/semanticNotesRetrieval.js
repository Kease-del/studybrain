import { embedText } from "./ai.js"
import { cosineSimilarity } from "./cosineSimilarity.js"
import { retrieveNotes } from "./notesRetrieval.js"

export const DEFAULT_MIN_SIMILARITY = 0.6
export const DEFAULT_MAX_RESULTS = 5
export const MIN_KEYWORD_SCORE = 6

const hasEmbedding = (note) =>
  Array.isArray(note?.embedding) && note.embedding.length > 0

const isMeaningfulKeywordMatch = (result) => {
  const fields = result.matchedFields ?? []
  if (fields.includes("title")) return true
  return result.score >= MIN_KEYWORD_SCORE
}

const meaningfulKeywordResults = (query, notes) =>
  retrieveNotes(query, notes).filter(isMeaningfulKeywordMatch)

export async function retrieveNotesSemantic(
  query,
  notes,
  { embed = embedText, minSimilarity = DEFAULT_MIN_SIMILARITY, maxResults = DEFAULT_MAX_RESULTS } = {}
) {
  if (!query || typeof query !== "string" || !query.trim()) return []

  const candidates = (notes ?? []).filter(hasEmbedding)
  if (candidates.length === 0) {
    return retrieveNotes(query, notes)
  }

  let queryVector
  try {
    queryVector = await embed(query.trim())
  } catch {
    return meaningfulKeywordResults(query, notes)
  }

  if (!Array.isArray(queryVector) || queryVector.length === 0) {
    return meaningfulKeywordResults(query, notes)
  }

  const matches = []
  for (const note of candidates) {
    const score = cosineSimilarity(queryVector, note.embedding)
    if (score >= minSimilarity) {
      matches.push({ id: note.id, note, score, matchedFields: ["semantic"] })
    }
  }

  if (matches.length === 0) {
    return meaningfulKeywordResults(query, notes)
  }

  matches.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return matches.slice(0, maxResults)
}
