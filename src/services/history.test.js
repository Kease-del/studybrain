import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { trimHistory } from "./history.js"

function msg(content, role = "user") {
  return { role, content }
}

describe("trimHistory", () => {
  it("returns empty array for empty input", () => {
    assert.deepEqual(trimHistory([]), [])
  })

  it("keeps short conversations intact", () => {
    const history = [
      msg("hi"),
      msg("hello", "assistant"),
      msg("what is 2+2?"),
      msg("4", "assistant"),
    ]
    assert.deepEqual(trimHistory(history), history)
  })

  it("caps the message count at the most recent messages", () => {
    const many = Array.from({ length: 30 }, (_, i) => msg(`message ${i} ${"x".repeat(50)}`))
    const trimmed = trimHistory(many)
    assert.ok(trimmed.length <= 12)
    assert.equal(trimmed[trimmed.length - 1], many[many.length - 1], "keeps the newest message")
    assert.equal(trimmed[0], many[many.length - trimmed.length], "drops the oldest messages")
  })

  it("caps total characters by trimming old messages", () => {
    const big = Array.from({ length: 20 }, (_, i) =>
      msg(`m${i} ${"y".repeat(2000)}`)
    )
    const trimmed = trimHistory(big)
    const total = trimmed.reduce((s, m) => s + m.content.length, 0)
    assert.ok(total <= 10000 + 2000, `history total ${total} exceeds char cap`)
    assert.equal(trimmed[trimmed.length - 1], big[big.length - 1], "always keeps the last user turn")
  })

  it("preserves relative order", () => {
    const history = [
      msg("first"),
      msg("second"),
      msg("third"),
    ]
    const trimmed = trimHistory(history)
    assert.deepEqual(trimmed.map((m) => m.content), ["first", "second", "third"])
  })
})
