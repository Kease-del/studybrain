/*
 * ─── Retriever ────────────────────────────────────────────────────
 *   Simple keyword-based retrieval for the StudyBrain knowledge base.
 *
 *   Scoring strategy:
 *   - The query is tokenised into lowercase keywords and cleaned of
 *     common stop words so only meaningful terms participate.
 *     Numeric tokens (e.g. "8", "3.14") are preserved — page numbers,
 *     chapter numbers, and figure references are meaningful.
 *   - Each knowledge item is scored by checking which of those
 *     keywords appear in its searchable fields.
 *   - A keyword matched in a given field adds a fixed weight to the
 *     item's total score.  The same keyword matching multiple times
 *     inside the same field still counts as one match for that
 *     field, preventing inflated scores from repetition.
 *   - Different fields carry different weights:
 *       title     3  (most descriptive — a match here is highly
 *                      relevant)
 *       filename  2  (PDF names often contain key terms)
 *       content   2  (vault text body)
 *       chunk     2  (individual PDF/DOCX passage — treated as
 *                      document content)
 *       text      1  (note body, can be longer / noisier)
 *       url       1  (URLs are terse, partial matches are common)
 *   - For PDF and DOCX items that have chunks, each chunk is scored
 *     individually.  Chunks are returned sorted by descending score
 *     so the context builder always sees the most relevant passages
 *     first, regardless of their position in the document.
 *   - Results are sorted by item score (descending) and capped at 5.
 *
 *   The output shape is:
 *     { id, type: "note" | "vault", item, score, matchedFields,
 *       matchedChunks?: { index, score, matchedKeywords }[] }
 * ─────────────────────────────────────────────────────────────────
 */

const STOP_WORDS = new Set([
  "the", "is", "what", "a", "an", "of", "to", "and",
  "in", "it", "for", "on", "that", "this", "with",
  "be", "as", "at", "by", "or", "are", "was", "were",
  "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "can", "could", "should",
  "may", "might", "shall", "not", "no", "nor", "but",
  "if", "so", "about", "into", "from", "i", "me", "my",
  "we", "our", "you", "your", "he", "him", "his",
  "she", "her", "they", "them", "their",
])

export const FIELD_WEIGHTS = {
  title: 3,
  filename: 2,
  content: 2,
  chunk: 2,
  text: 1,
  url: 1,
}

/**
 * Extracts numeric page references from a query string.
 *
 * Handles:
 *   "page 8"              → [8]
 *   "page eight"          → []    (non-numeric — handled via keyword matching)
 *   "pages 10-12"         → [10, 11, 12]
 *   "page 35"             → [35]
 *   "page 8 and 9"        → [8, 9]
 *   "page 8, 9, 10"       → [8, 9, 10]
 *
 * @param {string} query
 * @returns {number[]}
 */
export function extractPageRefs(query) {
  const refs = []
  const m = query.match(/pages?\s+(\d+)(?:\s*[-–]\s*(\d+))?/i)
  if (m) {
    if (m[2]) {
      const start = parseInt(m[1], 10)
      const end = parseInt(m[2], 10)
      for (let p = start; p <= end; p++) refs.push(p)
    } else {
      refs.push(parseInt(m[1], 10))
    }
    const after = query.slice(m.index + m[0].length)
    const extra = after.match(/(?:[,，、]\s*|\band\s+)+(\d+)/gi)
    if (extra) {
      for (const e of extra) {
        const n = e.match(/\d+/)
        if (n) refs.push(parseInt(n[0], 10))
      }
    }
  }
  return refs
}
export function tokenise(query) {
  return query
    .toLowerCase()
    .split(/[^\p{L}0-9]+/u)
    .filter((w) => (w.length > 1 || /^\d+$/.test(w)) && !STOP_WORDS.has(w))
}

/**
 * Returns the set of field values to search on for a given item.
 * Each entry is { fieldName, fieldValue }.
 *
 * @param {object} item — A note or vault resource object.
 * @param {"note"|"vault"} type
 * @returns {Array<{ field: string, value: string }>}
 */
function getSearchableFields(item, type) {
  if (type === "note") {
    return [{ field: "text", value: item.text ?? "" }]
  }

  const fields = [{ field: "title", value: item.title ?? "" }]

  if (item.type === "text") {
    fields.push({ field: "content", value: item.content ?? "" })
  } else if (item.type === "link") {
    fields.push({ field: "url", value: item.url ?? "" })
  } else if (item.type === "pdf" || item.type === "docx") {
    fields.push({ field: "filename", value: item.filename ?? "" })
    fields.push({ field: "content", value: item.content ?? "" })
    if (Array.isArray(item.chunks)) {
      item.chunks.forEach((chunk, i) => {
        fields.push({ field: `chunk_${i}`, value: chunk.text })
      })
    }
  }

  return fields
}

/**
 * Resolves the base field name for weight lookups.
 * "chunk_0" → "chunk", everything else stays as-is.
 */
function baseFieldName(field) {
  return field.startsWith("chunk_") ? "chunk" : field
}

/**
 * Scores a single item against a list of keywords and optional page
 * references.
 *
 * Non-chunk fields contribute to the item-level `score`.
 * Each chunk is scored independently and returned in `matchedChunks`,
 * sorted by descending score so the most relevant passages come first.
 *
 * When page references are present (e.g. the query mentions "page 8"),
 * chunks whose page range overlaps with the requested page(s) receive a
 * relevance bonus.  This is an additional signal on top of keyword
 * matching — chunks that are both keyword-relevant and page-relevant
 * rank highest.
 *
 * @param {string[]} keywords  — Normalised query keywords.
 * @param {object}   item
 * @param {"note"|"vault"} type
 * @param {number[]} [pageRefs=[]]  — Page numbers extracted from query.
 * @returns {object} { score, matchedFields, matchedChunks }
 */
function scoreItem(keywords, item, type, pageRefs = []) {
  let score = 0
  const matchedFields = []
  const chunkMap = new Map()

  for (const { field, value } of getSearchableFields(item, type)) {
    const lower = value.toLowerCase()
    const matchingKws = keywords.filter((kw) => lower.includes(kw))
    if (matchingKws.length === 0) continue

    const weight = FIELD_WEIGHTS[baseFieldName(field)] ?? 1
    const added = weight * matchingKws.length

    if (field.startsWith("chunk_")) {
      const idx = parseInt(field.replace("chunk_", ""), 10)
      if (!chunkMap.has(idx)) {
        chunkMap.set(idx, { score: 0, matchedKeywords: new Set() })
      }
      const entry = chunkMap.get(idx)
      entry.score += added
      for (const kw of matchingKws) {
        entry.matchedKeywords.add(kw)
      }
    } else {
      score += added
    }

    matchedFields.push(field)
  }

  // Record the highest keyword-match score so page-only chunks can be
  // injected with a score above keyword-only but below keyword+page.
  const maxKwScore = chunkMap.size > 0
    ? Math.max(...Array.from(chunkMap.values()).map((e) => e.score))
    : 0

  // A vault item whose keywords match only inside chunks (e.g. no title,
  // filename, or content match) must still qualify for retrieval.
  if (score === 0 && chunkMap.size > 0) {
    score = 1
  }

  // Page relevance bonus: boost chunks whose page range overlaps with
  // page references in the query (e.g. "page 8", "pages 10-12").
  if (pageRefs.length > 0 && Array.isArray(item.chunks)) {
    for (const [idx, entry] of chunkMap) {
      const chunk = item.chunks[idx]
      if (chunk.pageStart == null || chunk.pageEnd == null) continue
      const overlap = pageRefs.filter(
        (p) => p >= chunk.pageStart && p <= chunk.pageEnd
      )
      if (overlap.length > 0) {
        entry.score += overlap.length * 3
      }
    }

    // Also include page-relevant chunks that matched no keywords,
    // so content from the requested page reaches the context builder
    // even when its text lacks the query's exact keywords.
    for (let idx = 0; idx < item.chunks.length; idx++) {
      if (chunkMap.has(idx)) continue
      const chunk = item.chunks[idx]
      if (chunk.pageStart == null || chunk.pageEnd == null) continue
      const overlap = pageRefs.filter(
        (p) => p >= chunk.pageStart && p <= chunk.pageEnd
      )
      if (overlap.length > 0) {
        chunkMap.set(idx, { score: maxKwScore + 1, matchedKeywords: [] })
      }
    }
  }

  const scoredChunks = Array.from(chunkMap.entries())
    .map(([index, data]) => ({
      index,
      score: data.score,
      matchedKeywords: Array.from(data.matchedKeywords),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)

  return {
    score,
    matchedFields,
    matchedChunks: scoredChunks,
  }
}

/**
 * Page Retrieval Mode: returns every vault chunk whose page range overlaps
 * the requested page numbers, in ascending page order.
 *
 * @param {number[]} pageRefs  — Page numbers extracted from the query.
 * @param {Array}    vaultItems
 * @returns {Array<{ id, type: "vault", item, score: 0, matchedFields: ["page_ref"], pageChunks: { index, pageStart, pageEnd }[] }>}
 */
function retrieveByPage(pageRefs, vaultItems) {
  const results = []
  for (const item of vaultItems ?? []) {
    if (!item.id) continue
    if (item.type !== "pdf" && item.type !== "docx") continue
    if (!Array.isArray(item.chunks)) continue

    const matched = []
    for (let idx = 0; idx < item.chunks.length; idx++) {
      const chunk = item.chunks[idx]
      if (chunk.pageStart == null || chunk.pageEnd == null) continue
      const overlap = pageRefs.filter(
        (p) => p >= chunk.pageStart && p <= chunk.pageEnd
      )
      if (overlap.length > 0) {
        matched.push({
          index: idx,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
        })
      }
    }

    if (matched.length > 0) {
      matched.sort((a, b) => a.pageStart - b.pageStart || a.index - b.index)
      results.push({
        id: item.id,
        type: "vault",
        item,
        score: 0,
        matchedFields: ["page_ref"],
        pageChunks: matched,
      })
    }
  }
  return results
}

/**
 * Retrieves the top-5 most relevant notes and vault resources for a
 * given query using simple keyword matching.
 *
 * When the query includes explicit page references (e.g. "page 8",
 * "pages 10-12"), enters Page Retrieval Mode to return every chunk
 * whose page range overlaps the requested page(s), in document order,
 * bypassing keyword ranking entirely.
 *
 * Falls back to the keyword pipeline when page references are found
 * but no vault item has matching page data.
 *
 * @param {string}  query      — The user's natural-language question.
 * @param {Array}   notes      — Array of note objects ({ id, text, … }).
 * @param {Array}   vaultItems — Array of vault resource objects.
 * @returns {Array<{ id: string, type: "note"|"vault", item: object, score: number, matchedFields: string[], matchedChunks?: { index: number, score: number, matchedKeywords: string[] }[], pageChunks?: { index: number, pageStart: number, pageEnd: number }[] }>}
 *
 * Usage example:
 *   const results = retrieveRelevantKnowledge("page 8 mitochondria", notes, vaultItems)
 *   // → [{ id: "…", type: "note", item: {…}, score: 5, matchedFields: ["text"] },
 *   //    { id: "…", type: "vault", item: {…}, score: 4, matchedFields: ["title", "chunk_7"],
 *   //      matchedChunks: [{ index: 7, score: 4, matchedKeywords: ["mitochondria"] }] }]
 */
function retrieveByKeywords(keywords, notes, vaultItems, pageRefs) {
  const results = []

  for (const note of notes ?? []) {
    if (!note.id) continue
    const { score, matchedFields } = scoreItem(keywords, note, "note", pageRefs)
    if (score > 0) {
      results.push({
        id: note.id,
        type: "note",
        item: note,
        score,
        matchedFields,
      })
    }
  }

  for (const item of vaultItems ?? []) {
    if (!item.id) continue
    const { score, matchedFields, matchedChunks } = scoreItem(keywords, item, "vault", pageRefs)
    if (score > 0) {
      results.push({
        id: item.id,
        type: "vault",
        item,
        score,
        matchedFields,
        matchedChunks: matchedChunks.length > 0 ? matchedChunks : undefined,
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5)
}

export function retrieveRelevantKnowledge(query, notes, vaultItems) {
  if (!query || typeof query !== "string" || !query.trim()) {
    return []
  }

  const pageRefs = extractPageRefs(query)
  const keywords = tokenise(query)

  if (pageRefs.length > 0) {
    const pageResults = retrieveByPage(pageRefs, vaultItems)
    if (pageResults.length > 0) {
      const noteResults =
        keywords.length > 0
          ? retrieveByKeywords(keywords, notes, [], pageRefs)
          : []
      return [...noteResults, ...pageResults]
    }
  }

  if (keywords.length === 0) return []

  return retrieveByKeywords(keywords, notes, vaultItems, pageRefs)
}
