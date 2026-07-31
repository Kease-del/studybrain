import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildPageOffsets, findPage, chunkText } from "./chunker.js"

function makePages(n, textLen = 100) {
  return Array.from({ length: n }, (_, i) => ({
    page: i + 1,
    text: "x".repeat(textLen),
  }))
}

describe("buildPageOffsets", () => {
  it("returns empty array for no pages", () => {
    assert.deepEqual(buildPageOffsets([]), [])
  })

  it("computes correct start/end for each page", () => {
    const pages = [
      { page: 1, text: "hello" },
      { page: 2, text: "world" },
    ]
    // fullText = "--- PAGE 1 ---\n\nhello\n\n--- PAGE 2 ---\n\nworld"
    // marker1=16, pos=16, start=16, end=21, pos=23
    // marker2=16, pos=23→39, start=39, end=44
    const o = buildPageOffsets(pages)
    assert.equal(o.length, 2)
    assert.equal(o[0].page, 1)
    assert.equal(o[0].start, 16)
    assert.equal(o[0].end, 21)
    assert.equal(o[1].page, 2)
    assert.equal(o[1].start, 39)
    assert.equal(o[1].end, 44)
  })

  it("handles multi-digit page numbers", () => {
    const pages = [{ page: 520, text: "x" }]
    // "--- PAGE 520 ---\n\n" = 18 chars
    const o = buildPageOffsets(pages)
    assert.equal(o[0].page, 520)
    assert.equal(o[0].start, 18)
    assert.equal(o[0].end, 19)
  })
})

describe("findPage", () => {
  const pages = makePages(520, 100)
  const offsets = buildPageOffsets(pages)

  it("marker zone before page 1 returns page 1", () => {
    // Position 0 is the very start of "--- PAGE 1 ---" marker
    const p = findPage(offsets, 0)
    assert.equal(p, 1)
  })

  it("marker zone right before page 1 text returns page 1", () => {
    // Position 15 is just before page 1's text starts (starts at 16)
    const p = findPage(offsets, 15)
    assert.equal(p, 1)
  })

  it("inside page 1 text returns page 1", () => {
    // Page 1 text starts at 16, ends at 116
    const p = findPage(offsets, 50)
    assert.equal(p, 1)
  })

  it("marker zone between page 5 and page 6 returns page 5", () => {
    // Compute exact position in the gap between page 5's text end and page 6's text start
    // offset[4] = page 5, end = offset[4].end
    // The gap starts at offset[4].end and ends at offset[5].start
    const gapStart = offsets[4].end
    const gapEnd = offsets[5].start
    assert.ok(gapEnd > gapStart, "there is a gap between pages")
    const midGap = Math.floor((gapStart + gapEnd) / 2)
    const p = findPage(offsets, midGap)
    assert.equal(p, 5, `position ${midGap} in gap between page 5 and 6 should return 5`)
  })

  it("marker zone between page 200 and page 201 returns page 200", () => {
    const gapStart = offsets[199].end
    const gapEnd = offsets[200].start
    const midGap = Math.floor((gapStart + gapEnd) / 2)
    const p = findPage(offsets, midGap)
    assert.equal(p, 200, `position ${midGap} in gap between page 200 and 201 should return 200`)
  })

  it("inside page 300 text returns page 300", () => {
    const mid = Math.floor((offsets[299].start + offsets[299].end) / 2)
    const p = findPage(offsets, mid)
    assert.equal(p, 300)
  })

  it("inside last page (520) text returns 520", () => {
    const mid = Math.floor((offsets[519].start + offsets[519].end) / 2)
    const p = findPage(offsets, mid)
    assert.equal(p, 520)
  })

  it("position after last page text returns last page", () => {
    const p = findPage(offsets, offsets[519].end)
    assert.equal(p, 520)
  })

  it("null for empty offsets", () => {
    assert.equal(findPage([], 0), null)
  })
})

describe("chunkText page metadata invariants", () => {
  const pages = makePages(520, 100)
  const fullText = pages.map((p) => `--- PAGE ${p.page} ---\n\n${p.text}`).join("\n\n")
  const chunks = chunkText(fullText, pages, 2000)

  it("all chunks have pageStart defined", () => {
    for (const c of chunks) {
      assert.ok(c.pageStart != null, `chunk ${c.index} missing pageStart`)
    }
  })

  it("all chunks have pageEnd defined", () => {
    for (const c of chunks) {
      assert.ok(c.pageEnd != null, `chunk ${c.index} missing pageEnd`)
    }
  })

  it("no pageStart exceeds last page (520)", () => {
    for (const c of chunks) {
      assert.ok(c.pageStart <= 520, `chunk ${c.index} pageStart ${c.pageStart} > 520`)
    }
  })

  it("no pageEnd exceeds last page (520)", () => {
    for (const c of chunks) {
      assert.ok(c.pageEnd <= 520, `chunk ${c.index} pageEnd ${c.pageEnd} > 520`)
    }
  })

  it("pageStart <= pageEnd for every chunk (ascending ranges)", () => {
    for (const c of chunks) {
      assert.ok(c.pageStart <= c.pageEnd, `chunk ${c.index}: pageStart ${c.pageStart} > pageEnd ${c.pageEnd}`)
    }
  })
})

describe("chunkText page metadata content", () => {
  it("first chunk starts at page 1", () => {
    const pages = makePages(10, 100)
    const fullText = pages.map((p) => `--- PAGE ${p.page} ---\n\n${p.text}`).join("\n\n")
    const chunks = chunkText(fullText, pages, 2000)
    assert.equal(chunks[0].pageStart, 1, `expected 1, got ${chunks[0].pageStart}`)
  })

  it("last chunk ends at last page", () => {
    const pages = makePages(10, 100)
    const fullText = pages.map((p) => `--- PAGE ${p.page} ---\n\n${p.text}`).join("\n\n")
    const chunks = chunkText(fullText, pages, 2000)
    const last = chunks[chunks.length - 1]
    assert.equal(last.pageEnd, 10, `expected 10, got ${last.pageEnd}`)
  })

  it("backward compat: no pages array returns legacy { index, text }", () => {
    const chunks = chunkText("hello\n\nworld")
    assert.ok(chunks.length > 0)
    assert.equal(chunks[0].text, "hello\n\nworld")
    assert.equal(chunks[0].pageStart, undefined)
    assert.equal(chunks[0].pageEnd, undefined)
  })

  it("empty text returns empty array", () => {
    assert.deepEqual(chunkText(""), [])
    assert.deepEqual(chunkText("   "), [])
  })

  it("no pages = legacy output", () => {
    const chunks = chunkText("foo\n\nbar")
    assert.deepEqual(chunks, [
      { index: 0, text: "foo\n\nbar" },
    ])
  })
})
