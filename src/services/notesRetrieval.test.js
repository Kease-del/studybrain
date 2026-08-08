import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { retrieveNotes } from "./notesRetrieval.js"

function makeNote(id, overrides = {}) {
  return {
    id,
    title: `Title ${id}`,
    text: `Content for ${id}`,
    ...overrides,
  }
}

describe("retrieveNotes", () => {
  it("returns matching notes ranked by descending score", () => {
    const notes = [
      makeNote("a", { title: "Biology notes", text: "Mitochondria make ATP." }),
      makeNote("b", { title: "Cooking", text: "Mitochondria and pasta." }),
      makeNote("c", { title: "Unrelated", text: "Gardening tips." }),
    ]
    const result = retrieveNotes("mitochondria", notes)
    assert.ok(result.length >= 1)
    assert.equal(result[0].id, "a")
    assert.ok(result[0].score >= (result[1]?.score ?? 0))
  })

  it("matches the title field", () => {
    const notes = [makeNote("a", { title: "World Cup winners" })]
    const result = retrieveNotes("world cup", notes)
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "a")
    assert.ok(result[0].matchedFields.includes("title"))
  })

  it("matches the text field", () => {
    const notes = [
      makeNote("a", { title: "Study notes", text: "Respiration details here." }),
    ]
    const result = retrieveNotes("respiration", notes)
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "a")
    assert.ok(result[0].matchedFields.includes("text"))
  })

  it("limits results to five notes", () => {
    const notes = Array.from({ length: 10 }, (_, i) =>
      makeNote(`n${i}`, { title: "Common topic", text: "common keyword here" })
    )
    const result = retrieveNotes("common", notes)
    assert.equal(result.length, 5)
  })

  it("returns [] for an empty or missing query", () => {
    assert.deepEqual(retrieveNotes("", [makeNote("a")]), [])
    assert.deepEqual(retrieveNotes(null, [makeNote("a")]), [])
  })

  it("returns [] when there are no notes", () => {
    assert.deepEqual(retrieveNotes("biology", []), [])
    assert.deepEqual(retrieveNotes("biology", null), [])
  })
})
