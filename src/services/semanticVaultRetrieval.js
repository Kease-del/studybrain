import { embedText } from "./ai.js"
import { cosineSimilarity } from "./cosineSimilarity.js"
import { retrieveVaultResources } from "./vaultRetrieval.js"

export const DEFAULT_MIN_SIMILARITY = 0.6
export const DEFAULT_MAX_RESULTS = 5
export const MIN_KEYWORD_SCORE = 6

const hasEmbedding = (item) =>
  Array.isArray(item?.embedding) && item.embedding.length > 0

const isMeaningfulKeywordMatch = (result) => {
  const fields = result.matchedFields ?? []
  if (fields.includes("title") || fields.includes("tags")) return true
  return result.score >= MIN_KEYWORD_SCORE
}

const meaningfulKeywordResults = (query, vaultItems) =>
  retrieveVaultResources(query, vaultItems).filter(isMeaningfulKeywordMatch)

export async function retrieveVaultResourcesSemantic(
  query,
  vaultItems,
  { embed = embedText, minSimilarity = DEFAULT_MIN_SIMILARITY, maxResults = DEFAULT_MAX_RESULTS } = {}
) {
  if (!query || typeof query !== "string" || !query.trim()) return []

  const candidates = (vaultItems ?? []).filter(hasEmbedding)
  if (candidates.length === 0) {
    return retrieveVaultResources(query, vaultItems)
  }

  let queryVector
  try {
    queryVector = await embed(query.trim())
  } catch {
    return meaningfulKeywordResults(query, vaultItems)
  }

  if (!Array.isArray(queryVector) || queryVector.length === 0) {
    return meaningfulKeywordResults(query, vaultItems)
  }

  const matches = []
  for (const item of candidates) {
    const score = cosineSimilarity(queryVector, item.embedding)
    if (score >= minSimilarity) {
      matches.push({ id: item.id, item, score, matchedFields: ["semantic"] })
    }
  }

  if (matches.length === 0) {
    return meaningfulKeywordResults(query, vaultItems)
  }

  matches.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return matches.slice(0, maxResults)
}
