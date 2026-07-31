import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { retrieveRelevantKnowledge, extractPageRefs } from "./retriever.js"

function makeVault() {
  const chunks = Array.from({ length: 10 }, (_, i) => ({
    index: i,
    text: `chunk about mitochondria on page ${i + 1}. ${"x".repeat(300)}`,
    pageStart: i + 1,
    pageEnd: i + 1,
  }))
  return [
    {
      id: "vault-1",
      type: "pdf",
      title: "Biology notes",
      filename: "biology.pdf",
      chunks,
    },
  ]
}

describe("extractPageRefs", () => {
  it("handles single page, ranges, and lists", () => {
    assert.deepEqual(extractPageRefs("page 8"), [8])
    assert.deepEqual(extractPageRefs("pages 10-12"), [10, 11, 12])
    assert.deepEqual(extractPageRefs("page 8 and 9"), [8, 9])
    assert.deepEqual(extractPageRefs("page 8, 9, 10"), [8, 9, 10])
  })
})

describe("retrieveRelevantKnowledge page mode", () => {
  it("returns page chunks for a page range query", () => {
    const results = retrieveRelevantKnowledge("summarize pages 3-5", [], makeVault())
    assert.ok(results.length >= 1)
    const vault = results.find((r) => r.type === "vault")
    assert.ok(vault, "expected a vault result")
    assert.ok(vault.pageChunks.length > 0, "expected pageChunks")
    const pages = vault.pageChunks.flatMap((pc) => [pc.pageStart, pc.pageEnd])
    assert.ok(pages.some((p) => p === 3), "page 3 covered")
    assert.ok(pages.some((p) => p === 5), "page 5 covered")
  })

  it("merges matching notes into page-mode results", () => {
    const notes = [
      { id: "note-1", text: "mitochondria summary from lecture" },
    ]
    const results = retrieveRelevantKnowledge(
      "summarize pages 3-5 about mitochondria",
      notes,
      makeVault()
    )
    const noteResult = results.find((r) => r.type === "note")
    assert.ok(noteResult, "expected the matching note to be retrieved alongside page results")
  })

  it("does not lose page results when notes match", () => {
    const notes = [{ id: "note-1", text: "mitochondria summary" }]
    const results = retrieveRelevantKnowledge("pages 3-5 mitochondria", notes, makeVault())
    const vault = results.find((r) => r.type === "vault")
    assert.ok(vault, "vault page results must survive")
    assert.ok(vault.pageChunks.length > 0)
  })

  it("keyword mode still returns notes and vault together", () => {
    const notes = [{ id: "note-1", text: "mitochondria in lecture notes" }]
    const results = retrieveRelevantKnowledge("mitochondria", notes, makeVault())
    assert.ok(results.some((r) => r.type === "note"))
    assert.ok(results.some((r) => r.type === "vault"))
  })
})
