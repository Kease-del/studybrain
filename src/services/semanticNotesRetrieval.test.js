import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  retrieveNotesSemantic,
  DEFAULT_MIN_SIMILARITY,
  DEFAULT_MAX_RESULTS,
  MIN_KEYWORD_SCORE,
} from "./semanticNotesRetrieval.js"

function makeNote(id, overrides = {}) {
  return {
    id,
    title: `Title ${id}`,
    text: `Content for ${id}`,
    ...overrides,
  }
}

const identityEmbed = async () => [1, 0, 0]

describe("retrieveNotesSemantic", () => {
  it("returns semantic matches ranked by descending similarity", async () => {
    const notes = [
      makeNote("a", { embedding: [1, 0, 0] }),
      makeNote("b", { embedding: [0.9, 0.1, 0] }),
      makeNote("c", { embedding: [0.5, 0.5, 0] }),
    ]
    const result = await retrieveNotesSemantic("hello", notes, {
      embed: identityEmbed,
      minSimilarity: 0.5,
    })
    assert.equal(result.length, 3)
    assert.deepEqual(result.map((r) => r.id), ["a", "b", "c"])
    assert.ok(result[0].score > result[1].score)
    assert.deepEqual(result[0].matchedFields, ["semantic"])
    assert.equal(result[0].note.id, "a")
  })

  it("filters out matches below the similarity threshold", async () => {
    const notes = [
      makeNote("a", { embedding: [1, 0, 0] }),
      makeNote("b", { embedding: [0.2, 0.8, 0] }),
    ]
    const result = await retrieveNotesSemantic("hello", notes, {
      embed: identityEmbed,
      minSimilarity: 0.5,
    })
    assert.deepEqual(result.map((r) => r.id), ["a"])
  })

  it("limits results to the best five notes", async () => {
    const notes = Array.from({ length: 10 }, (_, i) =>
      makeNote(`note-${i}`, { embedding: [0.9, 0.1, 0] })
    )
    const result = await retrieveNotesSemantic("hello", notes, {
      embed: identityEmbed,
      minSimilarity: 0.5,
    })
    assert.equal(result.length, DEFAULT_MAX_RESULTS)
  })

  it("ignores notes without embeddings", async () => {
    const notes = [
      makeNote("embedded", { embedding: [1, 0, 0] }),
      makeNote("no-embedding-1", { embedding: null }),
      makeNote("no-embedding-2", { embedding: undefined }),
      makeNote("no-embedding-3", { embedding: [] }),
      makeNote("no-embedding-field"),
    ]
    const result = await retrieveNotesSemantic("hello", notes, {
      embed: identityEmbed,
      minSimilarity: 0.5,
    })
    assert.deepEqual(result.map((r) => r.id), ["embedded"])
  })

  it("falls back to keyword retrieval when embedding generation fails", async () => {
    const notes = [
      makeNote("note-1", {
        title: "Mitochondria notes",
        text: "Cells use oxygen to produce energy.",
        embedding: [1, 0, 0],
      }),
    ]
    const failingEmbed = async () => {
      throw new Error("no key")
    }
    const result = await retrieveNotesSemantic("mitochondria", notes, {
      embed: failingEmbed,
      minSimilarity: 0.5,
    })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "note-1")
    assert.ok(result[0].matchedFields.includes("title"))
  })

  it("falls back to keyword retrieval when the query embedding is empty", async () => {
    const notes = [
      makeNote("note-1", {
        title: "Cooking guide",
        text: "How to boil pasta and make tomato sauce.",
        embedding: [1, 0, 0],
      }),
    ]
    const emptyEmbed = async () => []
    const result = await retrieveNotesSemantic("cooking", notes, {
      embed: emptyEmbed,
      minSimilarity: 0.5,
    })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "note-1")
    assert.ok(result[0].matchedFields.includes("title"))
  })

  it("falls back to keyword retrieval when no matches satisfy the threshold", async () => {
    const notes = [
      makeNote("note-1", {
        title: "Mitochondria notes",
        text: "Cellular respiration generates ATP.",
        embedding: [0.1, 0.9, 0],
      }),
      makeNote("note-2", {
        title: "Cooking guide",
        text: "How to boil pasta and make tomato sauce.",
        embedding: [0.2, 0.8, 0],
      }),
    ]
    const result = await retrieveNotesSemantic("mitochondria", notes, {
      embed: identityEmbed,
      minSimilarity: 0.9,
    })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "note-1")
    assert.ok(result[0].matchedFields.includes("title"))
  })

  it("falls back to keyword retrieval when no notes have embeddings", async () => {
    const notes = [
      makeNote("note-1", {
        title: "Mitochondria notes",
        text: "Cells use oxygen to produce energy.",
      }),
    ]
    const result = await retrieveNotesSemantic("mitochondria", notes, {
      embed: identityEmbed,
      minSimilarity: 0.5,
    })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "note-1")
    assert.ok(result[0].matchedFields.includes("title"))
  })

  it("keyword fallback keeps title matches regardless of body score", async () => {
    const notes = [
      makeNote("note-1", {
        title: "World Cup notes",
        text: "France won the 2018 final.",
        embedding: [0.1, 0.9, 0],
      }),
    ]
    const result = await retrieveNotesSemantic(
      "Who won the 2018 FIFA World Cup?",
      notes,
      { embed: identityEmbed, minSimilarity: 0.9 }
    )
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "note-1")
  })

  it("exposes a meaningful keyword score constant", () => {
    assert.equal(typeof MIN_KEYWORD_SCORE, "number")
    assert.ok(MIN_KEYWORD_SCORE > 0)
  })

  it("returns [] for an empty or missing query", async () => {
    const notes = [makeNote("a", { embedding: [1, 0, 0] })]
    assert.deepEqual(
      await retrieveNotesSemantic("", notes, { embed: identityEmbed }),
      []
    )
    assert.deepEqual(
      await retrieveNotesSemantic(null, notes, { embed: identityEmbed }),
      []
    )
  })

  it("returns [] when there are no notes", async () => {
    const result = await retrieveNotesSemantic("hello", [], {
      embed: identityEmbed,
    })
    assert.deepEqual(result, [])
    const resultNull = await retrieveNotesSemantic("hello", null, {
      embed: identityEmbed,
    })
    assert.deepEqual(resultNull, [])
  })

  it("exposes sensible defaults", () => {
    assert.equal(typeof DEFAULT_MIN_SIMILARITY, "number")
    assert.equal(DEFAULT_MAX_RESULTS, 5)
  })
})
