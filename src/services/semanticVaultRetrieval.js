import { embedText } from "./ai.js"
import { cosineSimilarity } from "./cosineSimilarity.js"
import { retrieveVaultResources } from "./vaultRetrieval.js"

export const DEFAULT_MIN_SIMILARITY = 0.3
export const DEFAULT_MAX_RESULTS = 5

const hasEmbedding = (item) =>
  Array.isArray(item?.embedding) && item.embedding.length > 0

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
    return retrieveVaultResources(query, vaultItems)
  }

  if (!Array.isArray(queryVector) || queryVector.length === 0) {
    return retrieveVaultResources(query, vaultItems)
  }

  const matches = []
  for (const item of candidates) {
    const score = cosineSimilarity(queryVector, item.embedding)
    if (score >= minSimilarity) {
      matches.push({ id: item.id, item, score, matchedFields: ["semantic"] })
    }
  }

  if (matches.length === 0) {
    return retrieveVaultResources(query, vaultItems)
  }

  matches.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return matches.slice(0, maxResults)
}
