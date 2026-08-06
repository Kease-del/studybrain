import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  buildEmbeddingSource,
  hashEmbeddingSource,
  needsEmbedding,
  attachEmbedding,
  createEmbeddingDefaults,
  ensureVaultItemEmbedding,
} from "./vaultEmbedding.js"

function makeItem(overrides = {}) {
  return {
    id: "vault-1",
    type: "text",
    title: "Biology notes",
    tags: ["biology", "mitochondria"],
    content: "Mitochondria generate ATP through cellular respiration.",
    ...overrides,
  }
}

const fakeVector = [0.1, 0.2, 0.3]

describe("buildEmbeddingSource", () => {
  it("combines title, tags and content", () => {
    const source = buildEmbeddingSource(makeItem())
    assert.ok(source.includes("Biology notes"))
    assert.ok(source.includes("biology"))
    assert.ok(source.includes("mitochondria"))
    assert.ok(source.includes("Mitochondria generate ATP"))
  })

  it("uses the url for link resources instead of content", () => {
    const source = buildEmbeddingSource(
      makeItem({ type: "link", url: "https://example.com/physics", content: "ignored" })
    )
    assert.ok(source.includes("https://example.com/physics"))
    assert.ok(!source.includes("ignored"))
  })

  it("returns an empty string when nothing is embeddable", () => {
    assert.equal(buildEmbeddingSource({ id: "x", type: "text" }), "")
    assert.equal(buildEmbeddingSource(null), "")
  })
})

describe("hashEmbeddingSource", () => {
  it("produces a stable hex hash for identical input", () => {
    const a = hashEmbeddingSource("same source")
    const b = hashEmbeddingSource("same source")
    assert.equal(a, b)
    assert.match(a, /^[0-9a-f]{8}$/)
  })

  it("changes when the source changes", () => {
    const a = hashEmbeddingSource("title content")
    const b = hashEmbeddingSource("title other content")
    assert.notEqual(a, b)
  })
})

describe("needsEmbedding", () => {
  it("returns true for a fresh resource with no embedding", () => {
    assert.equal(needsEmbedding(makeItem()), true)
  })

  it("returns true for backwards-compatible items missing embedding fields", () => {
    const legacy = { id: "x", type: "text", title: "Old note", tags: [], content: "body" }
    assert.equal(needsEmbedding(legacy), true)
  })

  it("returns false once an embedding is attached for the current source", () => {
    const item = attachEmbedding(makeItem(), fakeVector)
    assert.equal(needsEmbedding(item), false)
  })

  it("returns true again when the source changes after embedding", () => {
    const item = attachEmbedding(makeItem(), fakeVector)
    const edited = { ...item, content: "Completely rewritten content." }
    assert.equal(needsEmbedding(edited), true)
  })

  it("returns false for an empty source", () => {
    assert.equal(needsEmbedding({ id: "x", type: "text" }), false)
    assert.equal(needsEmbedding(null), false)
  })
})

describe("attachEmbedding", () => {
  it("stores the vector and the matching source hash", () => {
    const item = makeItem()
    const embedded = attachEmbedding(item, fakeVector)
    assert.deepEqual(embedded.embedding, fakeVector)
    assert.equal(embedded.embeddingSourceHash, hashEmbeddingSource(buildEmbeddingSource(item)))
    assert.equal(embedded.id, item.id)
  })
})

describe("createEmbeddingDefaults", () => {
  it("returns null embedding fields for storage", () => {
    assert.deepEqual(createEmbeddingDefaults(), {
      embedding: null,
      embeddingSourceHash: null,
    })
  })
})

describe("ensureVaultItemEmbedding", () => {
  it("embeds a fresh resource and attaches the vector", async () => {
    const item = makeItem()
    const embed = async (source) => {
      assert.ok(source.includes("Biology notes"))
      return fakeVector
    }
    const result = await ensureVaultItemEmbedding(item, embed)
    assert.deepEqual(result.embedding, fakeVector)
    assert.ok(result.embeddingSourceHash)
    assert.equal(result.id, item.id)
  })

  it("skips resources that are already embedded for the current source", async () => {
    const item = attachEmbedding(makeItem(), fakeVector)
    let calls = 0
    const embed = async () => {
      calls++
      return fakeVector
    }
    const result = await ensureVaultItemEmbedding(item, embed)
    assert.equal(result, item)
    assert.equal(calls, 0)
  })

  it("returns the original item unchanged when embedding fails", async () => {
    const item = makeItem()
    const embed = async () => {
      throw new Error("rate limited")
    }
    const result = await ensureVaultItemEmbedding(item, embed)
    assert.equal(result, item)
    assert.equal(result.embedding, undefined)
  })

  it("does not embed an empty source", async () => {
    const item = { id: "x", type: "text", title: "", tags: [], content: "" }
    let calls = 0
    const embed = async () => {
      calls++
      return fakeVector
    }
    const result = await ensureVaultItemEmbedding(item, embed)
    assert.equal(result, item)
    assert.equal(calls, 0)
  })
})
