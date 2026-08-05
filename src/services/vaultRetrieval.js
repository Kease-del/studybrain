import { tokenise, FIELD_WEIGHTS } from "./retriever.js"

const TAGS_WEIGHT = 3

const MAX_RESOURCES = 3
const MAX_SECTION_CHARS = 1500

function searchableFields(item) {
  const fields = []
  if (item.title) {
    fields.push({ field: "title", value: item.title })
  }
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    fields.push({ field: "tags", value: item.tags.join(" ") })
  }
  const content = item.type === "link" ? item.url ?? "" : item.content ?? ""
  if (content) {
    fields.push({ field: "content", value: content })
  }
  return fields
}

function scoreItem(keywords, item) {
  let score = 0
  const matchedFields = []
  for (const { field, value } of searchableFields(item)) {
    const lower = value.toLowerCase()
    const matching = keywords.filter((kw) => lower.includes(kw))
    if (matching.length === 0) continue
    const weight = field === "tags" ? TAGS_WEIGHT : (FIELD_WEIGHTS[field] ?? 1)
    score += weight * matching.length
    matchedFields.push(field)
  }
  return { score, matchedFields }
}

export function retrieveVaultResources(query, vaultItems) {
  if (!query || typeof query !== "string" || !query.trim()) return []
  const keywords = tokenise(query)
  if (keywords.length === 0) return []

  const results = []
  for (const item of vaultItems ?? []) {
    if (!item?.id) continue
    const { score, matchedFields } = scoreItem(keywords, item)
    if (score > 0) {
      results.push({ id: item.id, item, score, matchedFields })
    }
  }

  results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return results.slice(0, MAX_RESOURCES)
}

function truncate(text, max) {
  if (!text) return ""
  const t = String(text).trim()
  return t.length > max ? `${t.slice(0, max)}\u2026` : t
}

function resourceLabel(item) {
  if (item.title) return String(item.title).trim()
  if (item.filename) return String(item.filename).trim()
  if (item.url) return String(item.url).trim()
  return "Untitled"
}

function resourceContent(item) {
  if (item.type === "link") {
    return truncate(item.url, MAX_SECTION_CHARS)
  }
  return truncate(item.content, MAX_SECTION_CHARS)
}

export function buildVaultResourcesSection(resources) {
  if (!resources || resources.length === 0) return null

  const lines = ["Relevant Vault Resources:"]
  for (let i = 0; i < resources.length; i++) {
    const item = resources[i].item
    const content = resourceContent(item)
    lines.push(`${i + 1}. ${resourceLabel(item)}${content ? `:\n${content}` : ""}`)
  }
  return lines.join("\n")
}
