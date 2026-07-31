import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { getSourceClass, SOURCE_CLASSES } from "./sources.js"

describe("getSourceClass", () => {
  it("maps prompt source flags to a badge class", () => {
    assert.equal(getSourceClass({ ai: true }), "ai")
    assert.equal(getSourceClass({ ai: true, vault: true }), "ai_vault")
    assert.equal(getSourceClass({ ai: true, notes: true }), "ai_notes")
    assert.equal(getSourceClass({ ai: true, vault: true, notes: true }), "ai_vault_notes")
  })

  it("defaults to ai when no flags are set", () => {
    assert.equal(getSourceClass(), "ai")
    assert.equal(getSourceClass({}), "ai")
    assert.equal(getSourceClass({ vault: true }), "vault")
  })

  it("reports vault/notes only when the flags say so", () => {
    assert.equal(getSourceClass({ ai: true, notes: true }), "ai_notes")
    assert.equal(getSourceClass({ ai: true }), "ai")
  })

  it("every class produced by getSourceClass has a defined badge", () => {
    const flags = [
      {},
      { ai: true },
      { ai: true, vault: true },
      { ai: true, notes: true },
      { ai: true, vault: true, notes: true },
    ]
    for (const f of flags) {
      const key = getSourceClass(f)
      assert.ok(SOURCE_CLASSES[key], `missing badge for ${key}`)
      assert.ok(SOURCE_CLASSES[key].label, `missing label for ${key}`)
    }
  })
})
