import { embedText } from "./ai.js"
import { tokenise } from "./retriever.js"
import { retrieveNotesSemantic } from "./semanticNotesRetrieval.js"
import { retrieveVaultResourcesSemantic } from "./semanticVaultRetrieval.js"

const MAX_SECTION_CHARS = 1500

// Ranked results are ordered by a composite `relevance` score. Semantic
// similarity is the primary signal; keyword/title/tag evidence only nudges
// ordering. Keyword-only fallback results are capped below the semantic
// threshold so they can never outrank an actual semantic match.
const SEMANTIC_BOOST_MAX = 0.1
const KEYWORD_RESULT_CEILING = 0.59
const EVIDENCE_CAP = 12

function truncate(text, max) {
  if (!text) return ""
  const t = String(text).trim()
  return t.length > max ? `${t.slice(0, max)}\u2026` : t
}

/**
 * Merges semantic note and vault results into a single ranked knowledge list.
 *
 * Both retrievers produce `{ id, score, matchedFields }` objects but differ in
 * the item field name (`note` vs `item`). This normalises them to
 * `{ id, type: "note" | "vault", item, score, matchedFields }`, deduplicates by
 * source id, and ranks by descending score (ties broken by id).
 *
 * @param {Array} noteResults  — Results from retrieveNotesSemantic.
 * @param {Array} vaultResults — Results from retrieveVaultResourcesSemantic.
 * @returns {Array<{ id: string, type: "note"|"vault", item: object, score: number, matchedFields: string[] }>}
 */
export function mergeSemanticResults(noteResults, vaultResults) {
  const merged = []
  const seen = new Set()

  for (const r of noteResults ?? []) {
    if (!r?.id) continue
    const key = `note:${r.id}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push({
      id: r.id,
      type: "note",
      item: r.note ?? r.item,
      score: r.score ?? 0,
      matchedFields: r.matchedFields ?? [],
    })
  }

  for (const r of vaultResults ?? []) {
    if (!r?.id) continue
    const key = `vault:${r.id}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push({
      id: r.id,
      type: "vault",
      item: r.item ?? r.note,
      score: r.score ?? 0,
      matchedFields: r.matchedFields ?? [],
    })
  }

  return merged.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
}

/**
 * The searchable fields used to derive keyword/title/tag evidence for a
 * merged result. Weights mirror the keyword retrievers so evidence is
 * consistent across note and vault sources.
 *
 * @param {object} item
 * @param {"note"|"vault"} type
 * @returns {Array<{ field: string, weight: number, value: string }>}
 */
function fieldEvidence(item, type) {
  if (type === "note") {
    return [
      { field: "title", weight: 3, value: item?.title },
      { field: "text", weight: 1, value: item?.text },
    ]
  }
  return [
    { field: "title", weight: 3, value: item?.title },
    { field: "tags", weight: 3, value: Array.isArray(item?.tags) ? item.tags.join(" ") : "" },
    { field: "filename", weight: 2, value: item?.filename },
    {
      field: "content",
      weight: 2,
      value: item?.type === "link" ? item?.url : item?.content,
    },
  ]
}

/**
 * Computes deterministic keyword/title/tag evidence for an item against a
 * query. Returns a weighted count of distinct matching keywords per field and
 * the list of matched fields. Semantic results reuse this as a small boost;
 * keyword-only results are ranked by it directly.
 *
 * @param {string} query
 * @param {object} item
 * @param {"note"|"vault"} type
 * @returns {{ evidence: number, fields: string[] }}
 */
function computeKeywordEvidence(query, item, type) {
  const keywords = tokenise(query)
  if (keywords.length === 0) return { evidence: 0, fields: [] }

  let evidence = 0
  const fields = []
  for (const { field, weight, value } of fieldEvidence(item, type)) {
    const lower = String(value ?? "").toLowerCase()
    const matching = keywords.filter((kw) => lower.includes(kw))
    if (matching.length === 0) continue
    evidence += weight * matching.length
    fields.push(field)
  }
  return { evidence, fields }
}

/**
 * Deterministic relevance score for a single merged result.
 *
 * Semantic matches keep their cosine similarity as the dominant component and
 * gain a small capped boost from keyword/title/tag evidence. Keyword-only
 * (fallback) results are scaled below the semantic threshold, so strong
 * semantic relevance always outranks a keyword match while keyword evidence
 * still differentiates between fallback results.
 *
 * @param {string} query
 * @param {{ id: string, type: "note"|"vault", item: object, score: number, matchedFields: string[] }} result
 * @returns {number}
 */
export function computeRelevanceScore(query, result) {
  const isSemantic = (result?.matchedFields ?? []).includes("semantic")
  const { evidence } = computeKeywordEvidence(query, result?.item, result?.type)
  const normalized = Math.min(evidence / EVIDENCE_CAP, 1)

  if (isSemantic) {
    return (result?.score ?? 0) + normalized * SEMANTIC_BOOST_MAX
  }
  return normalized * KEYWORD_RESULT_CEILING
}

/**
 * Re-ranks merged note and vault results by a composite relevance score while
 * preserving the normalized result shape (plus a `relevance` field).
 *
 * @param {Array} results
 * @param {string} query
 * @returns {Array}
 */
export function rankKnowledgeResults(results, query) {
  const ranked = (results ?? []).map((r) => ({
    ...r,
    relevance: computeRelevanceScore(query, r),
  }))
  return ranked.sort((a, b) => b.relevance - a.relevance || a.id.localeCompare(b.id))
}

function noteLabel(note) {
  if (note?.title && String(note.title).trim()) return String(note.title).trim()
  return "Untitled note"
}

function noteContent(note) {
  return truncate(note?.text, MAX_SECTION_CHARS)
}

function resourceLabel(item) {
  if (item?.title && String(item.title).trim()) return String(item.title).trim()
  if (item?.filename && String(item.filename).trim()) {
    return String(item.filename).trim()
  }
  if (item?.url) return String(item.url).trim()
  return "Untitled"
}

function resourceContent(item) {
  if (item?.type === "link") return truncate(item?.url, MAX_SECTION_CHARS)
  return truncate(item?.content, MAX_SECTION_CHARS)
}

/**
 * Builds a single "Relevant Knowledge" section from a merged list of note and
 * vault results. Returns null when there is nothing to inject.
 *
 * @param {Array<{ id: string, type: "note"|"vault", item: object, score: number, matchedFields: string[] }>} results
 * @returns {string|null}
 */
export function buildRelevantKnowledgeSection(results) {
  if (!results || results.length === 0) return null

  const lines = ["Relevant Knowledge:"]
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const item = r.item
    const isNote = r.type === "note"
    const label = isNote ? noteLabel(item) : resourceLabel(item)
    const content = isNote ? noteContent(item) : resourceContent(item)
    lines.push(
      `${i + 1}. [${isNote ? "Note" : "Resource"}] ${label}${
        content ? `:\n${content}` : ""
      }`
    )
  }
  return lines.join("\n")
}

/**
 * Semantic retrieval over both notes and vault resources for a single query.
 *
 * A single query embedding is computed once and shared by both retrievers so
 * a message incurs only one embedding API call. Each retriever keeps its own
 * relevance thresholds and keyword fallback, so an embedding failure degrades
 * gracefully to meaningful keyword matches without affecting note creation.
 *
 * @param {string} query
 * @param {Array} notes
 * @param {Array} vaultItems
 * @param {object} [opts]
 * @param {Function} [opts.embed]
 * @param {number} [opts.minSimilarity]
 * @param {number} [opts.maxResults]
 * @returns {Promise<Array<{ id: string, type: "note"|"vault", item: object, score: number, matchedFields: string[], relevance: number }>>}
 */
export async function retrieveRelevantKnowledgeSemantic(
  query,
  notes,
  vaultItems,
  { embed, minSimilarity, maxResults } = {}
) {
  if (!query || typeof query !== "string" || !query.trim()) return []

  let embedFn = embed
  if (!embedFn) {
    let cachedPromise
    embedFn = () => {
      if (!cachedPromise) {
        cachedPromise = embedText(query.trim())
      }
      return cachedPromise
    }
  }

  const opts = { embed: embedFn }
  if (minSimilarity != null) opts.minSimilarity = minSimilarity
  if (maxResults != null) opts.maxResults = maxResults

  const [noteResults, vaultResults] = await Promise.all([
    retrieveNotesSemantic(query, notes, opts),
    retrieveVaultResourcesSemantic(query, vaultItems, opts),
  ])

  return rankKnowledgeResults(mergeSemanticResults(noteResults, vaultResults), query)
}
