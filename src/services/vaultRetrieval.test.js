import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  retrieveVaultResources,
  buildVaultResourcesSection,
} from "./vaultRetrieval.js"

function makeItems() {
  return [
    {
      id: "vault-1",
      type: "text",
      title: "Biology notes",
      tags: ["biology", "mitochondria"],
      content: "Mitochondria generate ATP through cellular respiration.",
    },
    {
      id: "vault-2",
      type: "text",
      title: "Cooking guide",
      tags: ["recipes"],
      content: "How to boil pasta and make tomato sauce.",
    },
    {
      id: "vault-3",
      type: "text",
      title: "History timeline",
      tags: ["history"],
      content: "Key dates from the industrial revolution.",
    },
    {
      id: "vault-4",
      type: "link",
      title: "Khan Academy physics",
      tags: ["physics"],
      url: "https://khanacademy.org/physics",
    },
  ]
}

describe("retrieveVaultResources", () => {
  it("returns [] for a general question with no keyword overlap", () => {
    const result = retrieveVaultResources("great job on that", makeItems())
    assert.deepEqual(result, [])
  })

  it("retrieves a vault item when the query matches the title", () => {
    const result = retrieveVaultResources("cooking", makeItems())
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "vault-2")
  })

  it("retrieves a vault item when the query matches its tags", () => {
    const result = retrieveVaultResources("mitochondria", makeItems())
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "vault-1")
    assert.ok(result[0].matchedFields.includes("tags"))
  })

  it("retrieves a vault item when the query matches extracted content", () => {
    const result = retrieveVaultResources("pasta sauce", makeItems())
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "vault-2")
    assert.ok(result[0].matchedFields.includes("content"))
  })

  it("ranks title and tag matches above weaker content matches", () => {
    const items = [
      { id: "a", type: "text", title: "Photosynthesis lecture", tags: [], content: "" },
      { id: "b", type: "text", title: "Garden notes", tags: [], content: "photosynthesis in plants" },
    ]
    const result = retrieveVaultResources("photosynthesis", items)
    assert.equal(result[0].id, "a")
    assert.ok(result[0].score > result[1].score)
  })

  it("returns at most 3 resources", () => {
    const items = [
      { id: "a", type: "text", title: "Notes A", tags: [], content: "quantum mechanics" },
      { id: "b", type: "text", title: "Notes B", tags: [], content: "quantum mechanics" },
      { id: "c", type: "text", title: "Notes C", tags: [], content: "quantum mechanics" },
      { id: "d", type: "text", title: "Notes D", tags: [], content: "quantum mechanics" },
      { id: "e", type: "text", title: "Notes E", tags: [], content: "quantum mechanics" },
    ]
    const result = retrieveVaultResources("quantum mechanics", items)
    assert.equal(result.length, 3)
  })

  it("ignores items that match no keywords entirely", () => {
    const items = [
      { id: "a", type: "text", title: "Only biology", tags: [], content: "cells" },
      { id: "b", type: "text", title: "Unrelated", tags: [], content: "cooking" },
    ]
    const result = retrieveVaultResources("cells", items)
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "a")
  })

  it("returns [] for empty or missing vault items", () => {
    assert.deepEqual(retrieveVaultResources("biology", []), [])
    assert.deepEqual(retrieveVaultResources("biology", null), [])
    assert.deepEqual(retrieveVaultResources("", makeItems()), [])
  })
})

describe("buildVaultResourcesSection", () => {
  it("returns null for empty resources", () => {
    assert.equal(buildVaultResourcesSection([]), null)
    assert.equal(buildVaultResourcesSection(null), null)
    assert.equal(buildVaultResourcesSection(undefined), null)
  })

  it("builds a section with title and content per resource", () => {
    const section = buildVaultResourcesSection(
      retrieveVaultResources("mitochondria", makeItems())
    )
    assert.ok(section.includes("Relevant Vault Resources:"))
    assert.ok(section.includes("1. Biology notes"))
    assert.ok(section.includes("Mitochondria generate ATP"))
  })

  it("truncates very long content", () => {
    const items = [
      { id: "a", type: "text", title: "Long doc", tags: [], content: "x".repeat(5000) },
    ]
    const section = buildVaultResourcesSection(retrieveVaultResources("long", items))
    assert.ok(section.length < 5000)
    assert.ok(section.includes("…"))
  })

  it("falls back to url for link resources", () => {
    const section = buildVaultResourcesSection(
      retrieveVaultResources("physics", makeItems())
    )
    assert.ok(section.includes("1. Khan Academy physics"))
    assert.ok(section.includes("https://khanacademy.org/physics"))
  })
})
