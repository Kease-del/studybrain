const SYSTEM_INSTRUCTION = `You are a helpful study tutor for StudyBrain. Answer clearly and conversationally.

Response guidelines:
- Use short paragraphs and bullet points.
- Avoid long textbook-style responses.
- Avoid large Markdown tables unless a comparison truly needs one.
- Never use HTML tags like <br>. Use Markdown only.
- Use headings sparingly.
- Explain concepts step by step when needed.
- Include examples when they help learning.
- Do not repeat the same conclusion multiple times.
- Keep answers readable inside a chat bubble.
- **Math**: Mathematical expressions are rendered with KaTeX, so ALWAYS wrap them in LaTeX delimiters. Inline math must use $...$ (e.g. $E = mc^2$). Standalone/display equations must use $$...$$ on their own lines (e.g. $$\\frac{dy}{dx} + P(x)y = Q(x)$$). NEVER write math as bare bracket text like [ \\frac{dy}{dx} ] — the $ or $$ delimiters are mandatory so the math renders as typeset notation. Use clean, standard LaTeX: \\frac{a}{b} for fractions, \\sqrt{x}, \\int_{a}^{b}, \\sum_{n=1}^{\\infty}, \\lim_{x \\to 0}, \\begin{pmatrix}...\\end{pmatrix}, \\begin{cases}...\\end{cases}. Do not use \\bigl/\\bigr, spacing hacks, or \\! commands.

Knowledge guidelines:
- When the user's question relates to their saved knowledge, use it as the primary context for your answer.
- If the question is general or unrelated, answer normally without referencing the knowledge base.
- When you do use the user's saved notes or resources, briefly mention that the answer draws from their personal knowledge.
- **Verbatim quoting**: When the user asks for exact wording, a direct quote, or what something "says" or "says word for word", copy the relevant passage from their notes or resources exactly as written — do not paraphrase, summarize, or rephrase it. Preserve the original wording, punctuation, and line breaks.
- If the provided text is truncated (ends with "…"), say so and quote what is available.
- **Citations**: Sources are tagged with reference numbers like [1], [2]. When your answer draws on a specific source, cite it inline with the matching number (e.g. "[1]"). If an answer relies purely on general knowledge, no citation is needed.`

const MAX_NOTES = 15
const MAX_VAULT_ITEMS = 10
const MAX_TEXT_LENGTH = 3000
const MAX_CHUNK_CHARS = 8000
const RESERVED_RESPONSE_CHARS = 4000

function truncate(text, max) {
  if (!text?.trim()) return ""
  const trimmed = text.trim()
  return trimmed.length > max ? trimmed.slice(0, max) + "\u2026" : trimmed
}

function chunkRangeLabel(chunk) {
  if (chunk.pageStart == null) return ""
  return chunk.pageStart === chunk.pageEnd
    ? `Page ${chunk.pageStart}`
    : `Pages ${chunk.pageStart}-${chunk.pageEnd}`
}

function buildNotesSection(notes) {
  if (!notes || notes.length === 0) return { section: null, sources: [] }

  const lines = []
  const sources = []
  let ref = 1

  for (const n of notes.slice(0, MAX_NOTES)) {
    const text = truncate(n.text, MAX_TEXT_LENGTH)
    if (!text) continue
    lines.push(`[${ref}] ${text}`)
    sources.push(`[${ref}] Note: ${truncate(n.text, 80)}`)
    ref++
  }

  if (lines.length === 0) return { section: null, sources }

  return {
    section: [
      "\u2500\u2500\u2500 NOTES \u2500\u2500\u2500",
      ...lines,
    ].join("\n"),
    sources,
  }
}

function buildVaultSection(items, matchedChunksMap, pageChunksMap, contentBudget, refStart) {
  if (!items || items.length === 0) return { section: null, sources: [] }

  const lines = []
  const sources = []
  let ref = refStart

  for (const item of items.slice(0, MAX_VAULT_ITEMS)) {
    if (item.type === "text") {
      const content = truncate(item.content, MAX_TEXT_LENGTH)
      lines.push(`[${ref}] [Text] ${item.title}${content ? `: ${content}` : ""}`)
      sources.push(`[${ref}] ${item.title}`)
      ref++
    } else if (item.type === "link") {
      lines.push(`[${ref}] [Link] ${item.title}: ${item.url}`)
      sources.push(`[${ref}] ${item.title}`)
      ref++
    } else if (item.type === "pdf" || item.type === "docx") {
      const label = item.type === "pdf" ? "PDF" : "Document"
      const fileLabel = item.filename || `file.${item.type}`

      const scoredChunks = matchedChunksMap?.[item.id]
      const pageChunks = pageChunksMap?.[item.id]
      let chunkContent = false

      if (Array.isArray(item.chunks) && pageChunks?.length > 0) {
        const selected = []
        let budget = contentBudget ?? Infinity
        let truncated = false
        for (let pi = 0; pi < pageChunks.length; pi++) {
          const pc = pageChunks[pi]
          const chunk = item.chunks[pc.index]
          if (!chunk?.text) continue
          const header = `Source: ${item.filename || item.title}\n${chunkRangeLabel(chunk)}\n\n`
          const full = header + chunk.text
          if (selected.length === 0 && full.length > budget) {
            const partial = full.slice(0, budget)
            selected.push({ pc, text: partial })
            truncated = true
            break
          }
          if (full.length + (selected.length > 0 ? 1 : 0) > budget) {
            truncated = true
            break
          }
          if (selected.length > 0) budget -= 1
          selected.push({ pc, text: full })
          budget -= full.length
        }
        if (selected.length > 0) {
          lines.push(`- [${label}] ${item.title} (${fileLabel})`)
          for (const s of selected) {
            const range = chunkRangeLabel(item.chunks[s.pc.index])
            lines.push(`  [${ref}] ${s.text}`)
            sources.push(`[${ref}] ${fileLabel}${range ? ` — ${range}` : ""}`)
            ref++
          }
          if (truncated) {
            lines.push("  *[The requested page content was too large to include in full. Only the first portion is shown above. Ask about a specific section for more detail.]*")
          }
          chunkContent = true
        }
      } else if (Array.isArray(item.chunks) && scoredChunks?.length > 0) {
        let budget = Math.min(MAX_CHUNK_CHARS, contentBudget ?? MAX_CHUNK_CHARS)
        const selected = []
        for (const sc of scoredChunks) {
          const chunk = item.chunks[sc.index]
          if (!chunk?.text) continue

          const header = `Source: ${item.filename || item.title}\n${chunkRangeLabel(chunk)}\n\n`
          const full = header + chunk.text
          if (full.length > budget) continue

          selected.push({ chunk, text: full })
          budget -= full.length
        }
        if (selected.length > 0) {
          lines.push(`- [${label}] ${item.title} (${fileLabel})`)
          for (const s of selected) {
            const range = chunkRangeLabel(s.chunk)
            lines.push(`  [${ref}] ${s.text}`)
            sources.push(`[${ref}] ${fileLabel}${range ? ` — ${range}` : ""}`)
            ref++
          }
          chunkContent = true
        }
      }

      if (!chunkContent) {
        const content = truncate(item.content, MAX_TEXT_LENGTH)
        lines.push(`[${ref}] [${label}] ${item.title} (${fileLabel})${content ? `: ${content}` : ""}`)
        sources.push(`[${ref}] ${fileLabel}`)
        ref++
      }
    }
  }

  if (lines.length === 0) return { section: null, sources }

  return {
    section: [
      "\u2500\u2500\u2500 VAULT RESOURCES \u2500\u2500\u2500",
      ...lines,
    ].join("\n"),
    sources,
  }
}

export function splitPageBatches(item, pageChunks, contentBudget) {
  if (!item || !Array.isArray(pageChunks) || pageChunks.length === 0) return []
  const chunks = item.chunks || []

  const budget = contentBudget ?? Infinity
  const batches = []
  let current = []
  let used = 0

  for (const pc of pageChunks) {
    const chunk = chunks[pc.index]
    if (!chunk?.text) continue

    const header = `Source: ${item.filename || item.title}\n${chunkRangeLabel(chunk)}\n\n`
    const size = header.length + chunk.text.length

    if (current.length > 0 && used + size + 1 > budget) {
      batches.push(current)
      current = []
      used = 0
    }
    current.push(pc)
    used += size + (current.length > 1 ? 1 : 0)
  }

  if (current.length > 0) batches.push(current)
  return batches
}

export function buildKnowledgeContext(notes, vaultItems, matchedChunksMap, pageChunksMap, contentBudget, partInfo) {
  const notesBlock = buildNotesSection(notes)
  const vaultBlock = buildVaultSection(
    vaultItems,
    matchedChunksMap,
    pageChunksMap,
    contentBudget,
    notesBlock.sources.length + 1
  )

  const sections = [notesBlock.section, vaultBlock.section].filter(Boolean)
  const sources = [...notesBlock.sources, ...vaultBlock.sources]

  const sourceFlags = {
    ai: true,
    vault: vaultBlock.section != null,
    notes: notesBlock.section != null,
  }

  if (sections.length === 0) {
    return { prompt: SYSTEM_INSTRUCTION, sources: sourceFlags }
  }

  const parts = [
    SYSTEM_INSTRUCTION,
    "The user has the following saved in their personal knowledge base. Use it as the primary context for your answer.",
    ...sections,
  ]

  if (sources.length > 0) {
    parts.push(["\u2500\u2500\u2500 SOURCES \u2500\u2500\u2500", ...sources].join("\n"))
  }

  if (partInfo) {
    parts.push(
      `NOTE: This is part ${partInfo.part} of ${partInfo.total} of the requested page range. Only the content for this part is included below. Do not add "Part" headers or mention that this is a partial answer — answer the request for the content shown. The remaining parts are handled separately.`
    )
  }

  return { prompt: parts.join("\n\n"), sources: sourceFlags }
}

export function estimateContextTokens(contextMsg, conversationMessages) {
  const systemLen =
    typeof contextMsg === "string"
      ? contextMsg.length
      : (contextMsg?.prompt?.length ?? 0)
  const historyLen = conversationMessages?.reduce((sum, m) => sum + (m.content?.length ?? 0), 0) ?? 0
  const totalChars = systemLen + historyLen + RESERVED_RESPONSE_CHARS
  return Math.ceil(totalChars / 4)
}
