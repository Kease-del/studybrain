import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isAskingAboutKnowledge, getKnowledgeDomain } from "./queryIntent.js"

describe("getKnowledgeDomain", () => {
  it("notes references → notes domain", () => {
    assert.equal(getKnowledgeDomain("what did I save in my notes"), "notes")
    assert.equal(getKnowledgeDomain("summarize my notes"), "notes")
    assert.equal(getKnowledgeDomain("work on my note about cells"), "notes")
  })

  it("vault/resource/document references → vault domain", () => {
    assert.equal(getKnowledgeDomain("what resources do I have"), "vault")
    assert.equal(getKnowledgeDomain("what documents did I save"), "vault")
    assert.equal(getKnowledgeDomain("what's in my vault"), "vault")
    assert.equal(getKnowledgeDomain("list my pdfs"), "vault")
    assert.equal(getKnowledgeDomain("what does the document say about cells"), "vault")
  })

  it("mentions both or is generic → both", () => {
    assert.equal(getKnowledgeDomain("my notes and resources"), "both")
    assert.equal(getKnowledgeDomain("summarize everything I saved"), "both")
    assert.equal(getKnowledgeDomain("tell me a joke"), "both")
    assert.equal(getKnowledgeDomain(""), "both")
  })
})

describe("isAskingAboutKnowledge", () => {
  it("detects references to saved knowledge", () => {
    for (const q of [
      "whats in my notes",
      "summarize everything I saved",
      "summarize my notes",
      "what did I write about biology",
      "overview of my knowledge base",
      "did I save anything about quantum physics",
      "what resources do I have",
      "what does the document say about mitochondria",
      "what does this pdf cover",
      "what does the vault contain",
      "explain that note about cells",
    ]) {
      assert.equal(isAskingAboutKnowledge(q), true, `expected true: ${q}`)
    }
  })

  it("does not flag general questions", () => {
    for (const q of [
      "what is mitochondria",
      "tell me a joke",
      "explain cellular respiration",
    ]) {
      assert.equal(isAskingAboutKnowledge(q), false, `expected false: ${q}`)
    }
  })
})
