export function buildPageOffsets(pages) {
  const offsets = []
  let pos = 0
  for (const { page, text } of pages) {
    const marker = `--- PAGE ${page} ---\n\n`
    pos += marker.length
    const start = pos
    const end = pos + text.length
    offsets.push({ page, start, end })
    pos = end + 2
  }
  return offsets
}

export function findPage(offsets, charPos) {
  if (offsets.length === 0) return null
  for (let i = offsets.length - 1; i >= 0; i--) {
    if (charPos >= offsets[i].start) return offsets[i].page
  }
  return offsets[0].page
}

function chunkTextLegacy(text, maxChunkSize) {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim())
  if (paragraphs.length === 0) return []

  const chunks = []
  let current = paragraphs[0]

  for (let i = 1; i < paragraphs.length; i++) {
    const p = paragraphs[i]
    if ((current + "\n\n" + p).length > maxChunkSize) {
      chunks.push({ index: chunks.length, text: current.trim() })
      current = p
    } else {
      current = current + "\n\n" + p
    }
  }

  if (current.trim()) chunks.push({ index: chunks.length, text: current.trim() })

  return chunks
}

export function chunkText(text, pages = [], maxChunkSize = 2000) {
  if (!text) return []

  if (!pages || pages.length === 0) {
    return chunkTextLegacy(text, maxChunkSize)
  }

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim())
  if (paragraphs.length === 0) return []

  const offsets = buildPageOffsets(pages)

  let searchPos = 0
  const paraEntries = paragraphs.map((p) => {
    const start = text.indexOf(p, searchPos)
    searchPos = start + p.length
    return { text: p, start, end: start + p.length }
  })

  const chunks = []
  let currentText = paraEntries[0].text
  let currentStart = paraEntries[0].start
  let currentEnd = paraEntries[0].end

  for (let i = 1; i < paraEntries.length; i++) {
    const p = paraEntries[i]
    if ((currentText + "\n\n" + p.text).length > maxChunkSize) {
      chunks.push({
        index: chunks.length,
        text: currentText.trim(),
        pageStart: findPage(offsets, currentStart),
        pageEnd: findPage(offsets, currentEnd),
      })
      currentText = p.text
      currentStart = p.start
      currentEnd = p.end
    } else {
      currentText = currentText + "\n\n" + p.text
      currentEnd = p.end
    }
  }

  if (currentText.trim()) {
    chunks.push({
      index: chunks.length,
      text: currentText.trim(),
      pageStart: findPage(offsets, currentStart),
      pageEnd: findPage(offsets, currentEnd),
    })
  }

  return chunks
}
