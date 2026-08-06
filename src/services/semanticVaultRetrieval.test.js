import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  retrieveVaultResourcesSemantic,
  DEFAULT_MIN_SIMILARITY,
  DEFAULT_MAX_RESULTS,
} from "./semanticVaultRetrieval.js"

function makeItem(id, overrides = {}) {
  return {
    id,
    type: "text",
    title: `Title ${id}`,
    tags: [],
    content: `Content for ${id}`,
    ...overrides,
  }
}

const identityEmbed = async () => [1, 0, 0]

describe("retrieveVaultResourcesSemantic", () => {
  it("returns semantic matches ranked by descending similarity", async () => {
    const items = [
      makeItem("a", { embedding: [1, 0, 0] }),
      makeItem("b", { embedding: [0.9, 0.1, 0] }),
      makeItem("c", { embedding: [0.5, 0.5, 0] }),
    ]
    const result = await retrieveVaultResourcesSemantic(
      "hello",
      items,
      { embed: identityEmbed, minSimilarity: 0.5 }
    )
    assert.equal(result.length, 3)
    assert.deepEqual(result.map((r) => r.id), ["a", "b", "c"])
    assert.ok(result[0].score > result[1].score)
    assert.deepEqual(result[0].matchedFields, ["semantic"])
    assert.equal(result[0].item.id, "a")
  })

  it("filters out matches below the similarity threshold", async () => {
    const items = [
      makeItem("a", { embedding: [1, 0, 0] }),
      makeItem("b", { embedding: [0.2, 0.8, 0] }),
      makeItem("c", { embedding: [0.1, 0.9, 0] }),
    ]
    const result = await retrieveVaultResourcesSemantic(
      "hello",
      items,
      { embed: identityEmbed, minSimilarity: 0.5 }
    )
    assert.deepEqual(result.map((r) => r.id), ["a"])
  })

  it("limits results to the best five resources", async () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeItem(`item-${i}`, { embedding: [0.9, 0.1, 0] })
    )
    const result = await retrieveVaultResourcesSemantic(
      "hello",
      items,
      { embed: identityEmbed, minSimilarity: 0.5 }
    )
    assert.equal(result.length, DEFAULT_MAX_RESULTS)
    assert.equal(result.length, 5)
  })

  it("ignores resources without embeddings", async () => {
    const items = [
      makeItem("embedded", { embedding: [1, 0, 0] }),
      makeItem("no-embedding-1", { embedding: null }),
      makeItem("no-embedding-2", { embedding: undefined }),
      makeItem("no-embedding-3", { embedding: [] }),
      makeItem("no-embedding-field"),
    ]
    const result = await retrieveVaultResourcesSemantic(
      "hello",
      items,
      { embed: identityEmbed, minSimilarity: 0.5 }
    )
    assert.deepEqual(result.map((r) => r.id), ["embedded"])
  })

  it("falls back to keyword retrieval when embedding generation fails", async () => {
    const items = [
      makeItem("vault-1", {
        title: "Biology notes",
        tags: ["mitochondria"],
        content: "Mitochondria generate ATP through cellular respiration.",
        embedding: [1, 0, 0],
      }),
    ]
    const failingEmbed = async () => {
      throw new Error("no key")
    }
    const result = await retrieveVaultResourcesSemantic(
      "mitochondria",
      items,
      { embed: failingEmbed, minSimilarity: 0.5 }
    )
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "vault-1")
    assert.ok(result[0].matchedFields.includes("tags"))
  })

  it("falls back to keyword retrieval when the query embedding is empty", async () => {
    const items = [
      makeItem("vault-1", {
        title: "Cooking guide",
        tags: ["recipes"],
        content: "How to boil pasta and make tomato sauce.",
        embedding: [1, 0, 0],
      }),
    ]
    const emptyEmbed = async () => []
    const result = await retrieveVaultResourcesSemantic(
      "cooking",
      items,
      { embed: emptyEmbed, minSimilarity: 0.5 }
    )
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "vault-1")
    assert.ok(result[0].matchedFields.includes("title"))
  })

  it("falls back to keyword retrieval when no matches satisfy the threshold", async () => {
    const items = [
      makeItem("vault-1", {
        title: "Biology notes",
        tags: ["mitochondria"],
        content: "Mitochondria generate ATP through cellular respiration.",
        embedding: [0.1, 0.9, 0],
      }),
      makeItem("vault-2", {
        title: "Cooking guide",
        tags: ["recipes"],
        content: "How to boil pasta and make tomato sauce.",
        embedding: [0.2, 0.8, 0],
      }),
    ]
    const result = await retrieveVaultResourcesSemantic(
      "mitochondria",
      items,
      { embed: identityEmbed, minSimilarity: 0.9 }
    )
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "vault-1")
    assert.ok(result[0].matchedFields.includes("tags"))
  })

  it("falls back to keyword retrieval when no resources have embeddings", async () => {
    const items = [
      makeItem("vault-1", {
        title: "Biology notes",
        tags: ["mitochondria"],
        content: "Mitochondria generate ATP through cellular respiration.",
      }),
    ]
    const result = await retrieveVaultResourcesSemantic(
      "mitochondria",
      items,
      { embed: identityEmbed, minSimilarity: 0.5 }
    )
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "vault-1")
    assert.ok(result[0].matchedFields.includes("tags"))
  })

  it("returns [] for an empty or missing query", async () => {
    const items = [makeItem("a", { embedding: [1, 0, 0] })]
    assert.deepEqual(await retrieveVaultResourcesSemantic("", items, { embed: identityEmbed }), [])
    assert.deepEqual(await retrieveVaultResourcesSemantic(null, items, { embed: identityEmbed }), [])
  })

  it("returns [] when there are no vault items", async () => {
    const result = await retrieveVaultResourcesSemantic("hello", [], { embed: identityEmbed })
    assert.deepEqual(result, [])
    const resultNull = await retrieveVaultResourcesSemantic("hello", null, { embed: identityEmbed })
    assert.deepEqual(resultNull, [])
  })

  it("exposes sensible defaults", () => {
    assert.equal(typeof DEFAULT_MIN_SIMILARITY, "number")
    assert.equal(DEFAULT_MAX_RESULTS, 5)
  })
})
