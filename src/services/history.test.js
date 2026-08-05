import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { trimHistory, partitionMessagesForSummary } from "./history.js"

function msg(content, role = "user") {
  return { role, content }
}

describe("partitionMessagesForSummary", () => {
  const make = (n) =>
    Array.from({ length: n }, (_, i) => msg(`message ${i + 1}`))

  it("returns null for conversations at or below the trigger", () => {
    assert.equal(partitionMessagesForSummary(make(30)), null)
    assert.equal(partitionMessagesForSummary(make(29)), null)
    assert.equal(partitionMessagesForSummary([]), null)
  })

  it("triggers summarization on the 31st message", () => {
    const partition = partitionMessagesForSummary(make(31))
    assert.ok(partition, "31 messages should trigger")
    assert.equal(partition.toSummarize.length, 19, "summarizes everything except the newest 12")
    assert.equal(partition.keep.length, 12, "keeps the newest 12 verbatim")
    assert.equal(partition.toSummarize[0].content, "message 1")
    assert.equal(partition.keep[0].content, "message 20")
    assert.equal(partition.keep[11].content, "message 31")
  })

  it("keeps newest messages intact regardless of list size", () => {
    const partition = partitionMessagesForSummary(make(60))
    assert.equal(partition.keep.length, 12)
    assert.equal(partition.toSummarize.length, 48)
    assert.equal(partition.keep[11].content, "message 60")
  })

  it("filters out messages without string content", () => {
    const messages = [
      { role: "user", content: "" },
      { role: "user", content: "  " },
      { role: "assistant", content: "hi" },
      { role: "system", content: "x" },
    ]
    assert.equal(partitionMessagesForSummary(messages), null)
    const many = [
      { role: "user", content: "" },
      ...make(31),
      { role: "assistant", content: null },
    ]
    const partition = partitionMessagesForSummary(many)
    assert.equal(partition.keep.length, 12)
    assert.equal(partition.toSummarize.length, 19)
  })

  it("never summarizes when there are fewer than the recent-keep count", () => {
    assert.equal(partitionMessagesForSummary(make(5)), null)
  })
})

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
