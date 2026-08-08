import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  buildNoteEmbeddingSource,
  needsNoteEmbedding,
  attachNoteEmbedding,
  createEmbeddingDefaults,
  ensureNoteEmbedding,
} from "./notesEmbedding.js"
import { hashEmbeddingSource } from "./vaultEmbedding.js"

function makeNote(overrides = {}) {
  return {
    id: "note-1",
    title: "Biology notes",
    text: "Mitochondria generate ATP through cellular respiration.",
    ...overrides,
  }
}

const fakeVector = [0.1, 0.2, 0.3]

describe("buildNoteEmbeddingSource", () => {
  it("combines title and text", () => {
    const source = buildNoteEmbeddingSource(makeNote())
    assert.ok(source.includes("Biology notes"))
    assert.ok(source.includes("Mitochondria generate ATP"))
  })

  it("handles notes without a title", () => {
    const source = buildNoteEmbeddingSource(makeNote({ title: undefined }))
    assert.ok(source.includes("Mitochondria generate ATP"))
  })

  it("returns an empty string when nothing is embeddable", () => {
    assert.equal(buildNoteEmbeddingSource({ id: "x" }), "")
    assert.equal(buildNoteEmbeddingSource(null), "")
  })
})

describe("needsNoteEmbedding", () => {
  it("returns true for a fresh note with no embedding", () => {
    assert.equal(needsNoteEmbedding(makeNote()), true)
  })

  it("returns false once an embedding is attached for the current source", () => {
    const note = attachNoteEmbedding(makeNote(), fakeVector)
    assert.equal(needsNoteEmbedding(note), false)
  })

  it("returns true again when the text changes after embedding", () => {
    const note = attachNoteEmbedding(makeNote(), fakeVector)
    const edited = { ...note, text: "Completely rewritten note." }
    assert.equal(needsNoteEmbedding(edited), true)
  })

  it("returns false for an empty source", () => {
    assert.equal(needsNoteEmbedding({ id: "x" }), false)
    assert.equal(needsNoteEmbedding(null), false)
  })
})

describe("attachNoteEmbedding", () => {
  it("stores the vector and the matching source hash", () => {
    const note = makeNote()
    const embedded = attachNoteEmbedding(note, fakeVector)
    assert.deepEqual(embedded.embedding, fakeVector)
    assert.equal(
      embedded.embeddingSourceHash,
      hashEmbeddingSource(buildNoteEmbeddingSource(note))
    )
    assert.equal(embedded.id, note.id)
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

describe("ensureNoteEmbedding", () => {
  it("embeds a fresh note and attaches the vector", async () => {
    const note = makeNote()
    const embed = async (source) => {
      assert.ok(source.includes("Biology notes"))
      return fakeVector
    }
    const result = await ensureNoteEmbedding(note, embed)
    assert.deepEqual(result.embedding, fakeVector)
    assert.ok(result.embeddingSourceHash)
    assert.equal(result.id, note.id)
  })

  it("skips notes that are already embedded for the current source", async () => {
    const note = attachNoteEmbedding(makeNote(), fakeVector)
    let calls = 0
    const embed = async () => {
      calls++
      return fakeVector
    }
    const result = await ensureNoteEmbedding(note, embed)
    assert.equal(result, note)
    assert.equal(calls, 0)
  })

  it("returns the original note unchanged when embedding fails", async () => {
    const note = makeNote()
    const embed = async () => {
      throw new Error("rate limited")
    }
    const result = await ensureNoteEmbedding(note, embed)
    assert.equal(result, note)
    assert.equal(result.embedding, undefined)
  })

  it("does not embed an empty source", async () => {
    const note = { id: "x", title: "", text: "" }
    let calls = 0
    const embed = async () => {
      calls++
      return fakeVector
    }
    const result = await ensureNoteEmbedding(note, embed)
    assert.equal(result, note)
    assert.equal(calls, 0)
  })
})
