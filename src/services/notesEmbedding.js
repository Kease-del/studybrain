import { embedText } from "./ai.js"
import {
  hashEmbeddingSource,
  createEmbeddingDefaults,
} from "./vaultEmbedding.js"

export const EMBEDDING_UNAVAILABLE = "EMBEDDING_UNAVAILABLE"

export function buildNoteEmbeddingSource(note) {
  const parts = []
  if (note?.title) parts.push(note.title)
  if (note?.text) parts.push(note.text)
  return parts.join("\n")
}

export function needsNoteEmbedding(note) {
  if (!note) return false
  const source = buildNoteEmbeddingSource(note)
  if (!source) return false
  return (
    !Array.isArray(note.embedding) ||
    note.embeddingSourceHash !== hashEmbeddingSource(source)
  )
}

export function attachNoteEmbedding(note, vector) {
  return {
    ...note,
    embedding: vector,
    embeddingSourceHash: hashEmbeddingSource(buildNoteEmbeddingSource(note)),
  }
}

export async function ensureNoteEmbedding(note, embed = embedText) {
  if (!note || !needsNoteEmbedding(note)) return note
  try {
    const vector = await embed(buildNoteEmbeddingSource(note))
    return attachNoteEmbedding(note, vector)
  } catch (err) {
    console.warn(EMBEDDING_UNAVAILABLE, err?.message || "")
    return note
  }
}

export { createEmbeddingDefaults }
