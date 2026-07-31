import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { splitPageBatches } from "./contextBuilder.js"

function makeItem(chunks) {
  return {
    id: "vault-1",
    title: "Test doc",
    filename: "test.pdf",
    chunks,
  }
}

describe("splitPageBatches", () => {
  it("returns one batch when everything fits", () => {
    const chunks = [
      { index: 0, text: "a".repeat(500), pageStart: 1, pageEnd: 1 },
      { index: 1, text: "b".repeat(500), pageStart: 2, pageEnd: 2 },
    ]
    const item = makeItem(chunks)
    const batches = splitPageBatches(item, [
      { index: 0, pageStart: 1, pageEnd: 1 },
      { index: 1, pageStart: 2, pageEnd: 2 },
    ], 5000)
    assert.equal(batches.length, 1)
    assert.equal(batches[0].length, 2)
  })

  it("splits into multiple batches when budget is exceeded", () => {
    const chunks = Array.from({ length: 10 }, (_, i) => ({
      index: i,
      text: "x".repeat(1000),
      pageStart: i + 1,
      pageEnd: i + 1,
    }))
    const item = makeItem(chunks)
    const pageChunks = chunks.map((c) => ({ index: c.index, pageStart: c.pageStart, pageEnd: c.pageEnd }))
    // Each chunk block is ~1030 chars. Budget 2500 → 2 per batch.
    const batches = splitPageBatches(item, pageChunks, 2500)
    assert.ok(batches.length > 1, `expected multiple batches, got ${batches.length}`)
    assert.equal(batches[0].length, 2)
    assert.ok(batches[0][0].pageStart <= batches[0][1].pageStart, "preserves document order")
  })

  it("keeps all chunks across batches (no silent drops)", () => {
    const chunks = Array.from({ length: 12 }, (_, i) => ({
      index: i,
      text: "y".repeat(2000),
      pageStart: i + 1,
      pageEnd: i + 1,
    }))
    const item = makeItem(chunks)
    const pageChunks = chunks.map((c) => ({ index: c.index, pageStart: c.pageStart, pageEnd: c.pageEnd }))
    const batches = splitPageBatches(item, pageChunks, 3000)
    const total = batches.reduce((s, b) => s + b.length, 0)
    assert.equal(total, chunks.length, "every chunk must appear in exactly one batch")
    const seen = new Set(batches.flat().map((pc) => pc.index))
    assert.equal(seen.size, chunks.length)
  })

  it("handles a single chunk larger than budget", () => {
    const chunks = [{ index: 0, text: "z".repeat(5000), pageStart: 1, pageEnd: 1 }]
    const item = makeItem(chunks)
    const batches = splitPageBatches(item, [{ index: 0, pageStart: 1, pageEnd: 1 }], 1000)
    assert.equal(batches.length, 1)
    assert.equal(batches[0].length, 1)
  })

  it("returns [] for empty pageChunks", () => {
    const item = makeItem([])
    assert.deepEqual(splitPageBatches(item, [], 1000), [])
  })
})
