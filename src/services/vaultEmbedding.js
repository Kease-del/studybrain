import { embedText } from "./ai.js"

export const EMBEDDING_UNAVAILABLE = "EMBEDDING_UNAVAILABLE"

export function buildEmbeddingSource(item) {
  const parts = []
  if (item?.title) parts.push(item.title)
  if (Array.isArray(item?.tags) && item.tags.length > 0) {
    parts.push(item.tags.join(" "))
  }
  const content = item?.type === "link" ? item?.url : item?.content
  if (content) parts.push(content)
  return parts.join("\n")
}

export function hashEmbeddingSource(source) {
  let hash = 0x811c9dc5
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

export function needsEmbedding(item) {
  if (!item) return false
  const source = buildEmbeddingSource(item)
  if (!source) return false
  return (
    !Array.isArray(item.embedding) ||
    item.embeddingSourceHash !== hashEmbeddingSource(source)
  )
}

export function attachEmbedding(item, vector) {
  return {
    ...item,
    embedding: vector,
    embeddingSourceHash: hashEmbeddingSource(buildEmbeddingSource(item)),
  }
}

export function createEmbeddingDefaults() {
  return { embedding: null, embeddingSourceHash: null }
}

export async function ensureVaultItemEmbedding(item, embed = embedText) {
  if (!item || !needsEmbedding(item)) return item
  try {
    const vector = await embed(buildEmbeddingSource(item))
    return attachEmbedding(item, vector)
  } catch (err) {
    console.warn(EMBEDDING_UNAVAILABLE, err?.message || "")
    return item
  }
}
