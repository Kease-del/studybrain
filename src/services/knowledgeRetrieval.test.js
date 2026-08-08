import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  mergeSemanticResults,
  buildRelevantKnowledgeSection,
  retrieveRelevantKnowledgeSemantic,
  computeRelevanceScore,
  rankKnowledgeResults,
} from "./knowledgeRetrieval.js"

function makeNote(id, overrides = {}) {
  return {
    id,
    title: `Note ${id}`,
    text: `Body of note ${id}`,
    ...overrides,
  }
}

function makeVault(id, overrides = {}) {
  return {
    id,
    type: "text",
    title: `Vault ${id}`,
    content: `Content of vault ${id}`,
    ...overrides,
  }
}

const identityEmbed = async () => [1, 0, 0]

describe("mergeSemanticResults", () => {
  it("normalises note and vault results and ranks by descending score", () => {
    const noteResults = [{ id: "n1", note: makeNote("n1"), score: 0.7, matchedFields: ["semantic"] }]
    const vaultResults = [{ id: "v1", item: makeVault("v1"), score: 0.9, matchedFields: ["semantic"] }]

    const merged = mergeSemanticResults(noteResults, vaultResults)
    assert.equal(merged.length, 2)
    assert.equal(merged[0].type, "vault")
    assert.equal(merged[0].item.id, "v1")
    assert.equal(merged[1].type, "note")
    assert.equal(merged[1].item.id, "n1")
  })

  it("deduplicates results by source id", () => {
    const noteResults = [
      { id: "n1", note: makeNote("n1"), score: 0.8, matchedFields: ["semantic"] },
      { id: "n1", note: makeNote("n1"), score: 0.6, matchedFields: ["semantic"] },
    ]
    const merged = mergeSemanticResults(noteResults, [])
    assert.equal(merged.length, 1)
  })

  it("keeps notes and vault with the same id distinct", () => {
    const noteResults = [{ id: "shared", note: makeNote("shared"), score: 0.5, matchedFields: ["semantic"] }]
    const vaultResults = [{ id: "shared", item: makeVault("shared"), score: 0.9, matchedFields: ["semantic"] }]
    const merged = mergeSemanticResults(noteResults, vaultResults)
    assert.equal(merged.length, 2)
    assert.deepEqual(merged.map((r) => r.type), ["vault", "note"])
  })

  it("tolerates missing item fields and malformed results", () => {
    const merged = mergeSemanticResults(
      [{ id: "n1", score: 0.5 }, { id: null }],
      [{ id: "v1", item: makeVault("v1"), score: 0.7 }]
    )
    assert.equal(merged.length, 2)
    assert.equal(merged[0].id, "v1")
    assert.equal(merged[0].item.id, "v1")
    assert.equal(merged[1].id, "n1")
    assert.deepEqual(merged[1].matchedFields, [])
  })

  it("returns [] for missing inputs", () => {
    assert.deepEqual(mergeSemanticResults(null, null), [])
    assert.deepEqual(mergeSemanticResults(undefined, []), [])
  })

  it("breaks ties by id", () => {
    const merged = mergeSemanticResults(
      [
        { id: "b", note: makeNote("b"), score: 0.7, matchedFields: ["semantic"] },
        { id: "a", note: makeNote("a"), score: 0.7, matchedFields: ["semantic"] },
      ],
      []
    )
    assert.deepEqual(merged.map((r) => r.id), ["a", "b"])
  })
})

describe("buildRelevantKnowledgeSection", () => {
  it("returns null for empty or missing results", () => {
    assert.equal(buildRelevantKnowledgeSection([]), null)
    assert.equal(buildRelevantKnowledgeSection(null), null)
    assert.equal(buildRelevantKnowledgeSection(undefined), null)
  })

  it("builds a single section with note and resource entries", () => {
    const results = [
      { id: "n1", type: "note", item: makeNote("n1"), score: 0.9, matchedFields: ["semantic"] },
      { id: "v1", type: "vault", item: makeVault("v1"), score: 0.8, matchedFields: ["semantic"] },
    ]
    const section = buildRelevantKnowledgeSection(results)
    assert.ok(section.includes("Relevant Knowledge:"))
    assert.ok(section.includes("1. [Note] Note n1:\nBody of note n1"))
    assert.ok(section.includes("2. [Resource] Vault v1:\nContent of vault v1"))
  })

  it("truncates long content", () => {
    const results = [
      {
        id: "n1",
        type: "note",
        item: makeNote("n1", { text: "x".repeat(5000) }),
        score: 0.9,
        matchedFields: ["semantic"],
      },
    ]
    const section = buildRelevantKnowledgeSection(results)
    assert.ok(section.length < 3000)
    assert.ok(section.endsWith("…"))
  })

  it("falls back to filename and url for vault labels", () => {
    const pdfItem = { id: "v1", type: "pdf", filename: "biology.pdf", content: "page text" }
    const linkItem = { id: "v2", type: "link", url: "https://example.com/notes", title: "" }
    const section = buildRelevantKnowledgeSection([
      { id: "v1", type: "vault", item: pdfItem, score: 0.9, matchedFields: ["semantic"] },
      { id: "v2", type: "vault", item: linkItem, score: 0.8, matchedFields: ["semantic"] },
    ])
    assert.ok(section.includes("1. [Resource] biology.pdf"))
    assert.ok(section.includes("2. [Resource] https://example.com/notes"))
  })

  it("uses the url as content for link resources", () => {
    const linkItem = { id: "v1", type: "link", url: "https://example.com/notes", title: "My Link" }
    const section = buildRelevantKnowledgeSection([
      { id: "v1", type: "vault", item: linkItem, score: 0.9, matchedFields: ["semantic"] },
    ])
    assert.ok(section.includes("[Resource] My Link:\nhttps://example.com/notes"))
  })

  it("labels notes without a title", () => {
    const section = buildRelevantKnowledgeSection([
      { id: "n1", type: "note", item: { id: "n1", text: "quick capture" }, score: 0.9, matchedFields: ["semantic"] },
    ])
    assert.ok(section.includes("[Note] Untitled note:\nquick capture"))
  })
})

describe("retrieveRelevantKnowledgeSemantic", () => {
  it("merges semantic matches from notes and vault", async () => {
    const notes = [makeNote("n1", { embedding: [1, 0, 0] })]
    const vaultItems = [makeVault("v1", { embedding: [0.9, 0.1, 0] })]

    const result = await retrieveRelevantKnowledgeSemantic("hello", notes, vaultItems, {
      embed: identityEmbed,
      minSimilarity: 0.5,
    })
    assert.equal(result.length, 2)
    assert.deepEqual(result.map((r) => r.type), ["note", "vault"])
    assert.equal(result[0].item.id, "n1")
    assert.equal(result[1].item.id, "v1")
  })

  it("filters sources below the similarity threshold", async () => {
    const notes = [
      makeNote("n1", { embedding: [1, 0, 0] }),
      makeNote("n2", { embedding: [0.2, 0.8, 0] }),
    ]
    const vaultItems = []

    const result = await retrieveRelevantKnowledgeSemantic("hello", notes, vaultItems, {
      embed: identityEmbed,
      minSimilarity: 0.5,
    })
    assert.deepEqual(result.map((r) => r.id), ["n1"])
  })

  it("falls back to meaningful keyword matches when embedding fails", async () => {
    const notes = [
      makeNote("n1", {
        title: "Mitochondria notes",
        text: "Cells use oxygen to produce energy.",
        embedding: [1, 0, 0],
      }),
    ]
    const vaultItems = [
      makeVault("v1", {
        title: "Cooking guide",
        content: "How to boil pasta and make tomato sauce.",
        embedding: [1, 0, 0],
      }),
    ]
    const failingEmbed = async () => {
      throw new Error("no key")
    }

    const result = await retrieveRelevantKnowledgeSemantic("mitochondria", notes, vaultItems, {
      embed: failingEmbed,
      minSimilarity: 0.5,
    })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, "n1")
    assert.ok(result[0].matchedFields.includes("title"))
  })

  it("falls back to keyword retrieval when no items have embeddings", async () => {
    const notes = [makeNote("n1", { title: "Mitochondria notes", text: "Cells use oxygen." })]
    const vaultItems = [makeVault("v1", { title: "Mitochondria biology", content: "The powerhouse of the cell." })]

    const result = await retrieveRelevantKnowledgeSemantic("mitochondria", notes, vaultItems, {
      embed: identityEmbed,
      minSimilarity: 0.5,
    })
    assert.equal(result.length, 2)
    assert.deepEqual(result.map((r) => r.type), ["note", "vault"])
    assert.ok(result[0].matchedFields.includes("title"))
  })

  it("returns [] for an empty or missing query", async () => {
    const notes = [makeNote("n1", { embedding: [1, 0, 0] })]
    const vaultItems = [makeVault("v1", { embedding: [1, 0, 0] })]
    assert.deepEqual(
      await retrieveRelevantKnowledgeSemantic("", notes, vaultItems, { embed: identityEmbed }),
      []
    )
    assert.deepEqual(
      await retrieveRelevantKnowledgeSemantic(null, notes, vaultItems, { embed: identityEmbed }),
      []
    )
  })

  it("returns [] when there are no notes or vault items", async () => {
    const result = await retrieveRelevantKnowledgeSemantic("hello", [], [], {
      embed: identityEmbed,
    })
    assert.deepEqual(result, [])
  })

  it("passes a shared embed to both retrievers", async () => {
    const notes = [makeNote("n1", { embedding: [1, 0, 0] })]
    const vaultItems = [makeVault("v1", { embedding: [1, 0, 0] })]
    let calls = 0
    const countingEmbed = async () => {
      calls += 1
      return [1, 0, 0]
    }

    const result = await retrieveRelevantKnowledgeSemantic("hello", notes, vaultItems, {
      embed: countingEmbed,
      minSimilarity: 0.5,
    })
    assert.equal(result.length, 2)
    assert.ok(calls >= 2, "each retriever invokes the supplied embed")
  })
})

describe("unified knowledge ranking", () => {
  it("ranks a strong semantic match above a weak keyword-only match", async () => {
    const notes = [
      makeNote("n1", {
        title: "Photosynthesis explained",
        text: "Plants convert sunlight into chemical energy.",
        embedding: [1, 0, 0],
      }),
    ]
    const vaultItems = [
      makeVault("v1", {
        title: "Photosynthesis biology",
        content: "Light reactions produce ATP.",
      }),
    ]

    const result = await retrieveRelevantKnowledgeSemantic("photosynthesis", notes, vaultItems, {
      embed: identityEmbed,
      minSimilarity: 0.5,
    })
    assert.equal(result.length, 2)
    assert.equal(result[0].id, "n1")
    assert.equal(result[0].type, "note")
    assert.ok(result[0].matchedFields.includes("semantic"))
    assert.equal(result[1].id, "v1")
    assert.equal(result[1].type, "vault")
    assert.ok(result[0].relevance > result[1].relevance)
  })

  it("lets title and tag matches improve ordering between semantic results", () => {
    const titleHit = {
      id: "z",
      type: "note",
      item: makeNote("z", { title: "Biology basics", text: "Cell structures" }),
      score: 0.7,
      matchedFields: ["semantic"],
    }
    const tagHit = {
      id: "m",
      type: "vault",
      item: makeVault("m", { title: "Lecture 3", tags: ["biology"], content: "Long transcript" }),
      score: 0.7,
      matchedFields: ["semantic"],
    }
    const plain = {
      id: "a",
      type: "note",
      item: makeNote("a", { title: "Untitled rambling", text: "Nothing related" }),
      score: 0.7,
      matchedFields: ["semantic"],
    }

    const ranked = rankKnowledgeResults([plain, tagHit, titleHit], "biology")
    assert.deepEqual(ranked.map((r) => r.id), ["m", "z", "a"])
    assert.ok(ranked[0].relevance > ranked[2].relevance)
    assert.ok(ranked[1].relevance > ranked[2].relevance)
  })

  it("does not inject keyword matches that fail the semantic threshold", async () => {
    const notes = [
      makeNote("n1", {
        title: "Photosynthesis",
        text: "Sunlight turns water and CO2 into glucose.",
        embedding: [1, 0, 0],
      }),
      makeNote("n2", {
        title: "Photosynthesis notes",
        text: "About chlorophyll and stomata.",
        embedding: [0.2, 0.8, 0],
      }),
    ]
    const vaultItems = [
      makeVault("v1", {
        title: "Photosynthesis textbook",
        content: "Light-dependent reactions in detail.",
      }),
      makeVault("v2", {
        title: "Cooking guide",
        content: "How to boil pasta and make tomato sauce.",
      }),
    ]

    const result = await retrieveRelevantKnowledgeSemantic("photosynthesis", notes, vaultItems, {
      embed: identityEmbed,
      minSimilarity: 0.5,
    })
    const ids = result.map((r) => r.id)
    assert.ok(ids.includes("n1"), "semantic match present")
    assert.ok(ids.includes("v1"), "keyword fallback present")
    assert.ok(!ids.includes("n2"), "below-threshold keyword match is not injected")
    assert.ok(!ids.includes("v2"), "completely unrelated content is excluded")
    assert.equal(ids[0], "n1")
  })

  it("merges notes and vault results without duplicates after ranking", () => {
    const noteResults = [
      { id: "shared", note: makeNote("shared", { title: "Duplicate concept" }), score: 0.8, matchedFields: ["semantic"] },
      { id: "shared", note: makeNote("shared", { title: "Duplicate concept" }), score: 0.6, matchedFields: ["semantic"] },
      { id: "n1", note: makeNote("n1", { title: "Biology", text: "Cells" }), score: 0.7, matchedFields: ["semantic"] },
    ]
    const vaultResults = [
      { id: "shared", item: makeVault("shared", { title: "Biology vault", tags: ["biology"] }), score: 0.9, matchedFields: ["semantic"] },
      { id: "v1", item: makeVault("v1", { title: "Lecture notes", content: "Transcript" }), score: 0.65, matchedFields: ["semantic"] },
    ]

    const merged = mergeSemanticResults(noteResults, vaultResults)
    assert.equal(merged.length, 4)

    const ranked = rankKnowledgeResults(merged, "biology")
    assert.equal(ranked.length, 4)
    const keys = ranked.map((r) => `${r.type}:${r.id}`)
    assert.equal(new Set(keys).size, 4, "no duplicate note/vault keys")
    assert.deepEqual(keys, ["vault:shared", "note:shared", "note:n1", "vault:v1"])
  })

  it("keeps keyword-only relevance below any semantic match", () => {
    const weakSemantic = {
      id: "s1",
      type: "note",
      item: makeNote("s1", { title: "Biology basics", text: "Cells" }),
      score: 0.6,
      matchedFields: ["semantic"],
    }
    const strongKeyword = {
      id: "k1",
      type: "vault",
      item: makeVault("k1", {
        title: "Biology biology biology biology",
        content: "biology biology biology biology biology biology biology biology biology biology",
        tags: ["biology"],
      }),
      score: 9,
      matchedFields: ["title", "content", "tags"],
    }

    assert.ok(computeRelevanceScore("biology", weakSemantic) > computeRelevanceScore("biology", strongKeyword))
    const ranked = rankKnowledgeResults([strongKeyword, weakSemantic], "biology")
    assert.equal(ranked[0].id, "s1")
  })

  it("is deterministic for identical inputs", () => {
    const results = [
      { id: "n1", type: "note", item: makeNote("n1", { title: "Mitochondria" }), score: 0.8, matchedFields: ["semantic"] },
      { id: "v1", type: "vault", item: makeVault("v1", { title: "Cooking", content: "Pasta" }), score: 3, matchedFields: ["title"] },
    ]
    const a = rankKnowledgeResults(results, "mitochondria")
    const b = rankKnowledgeResults(results, "mitochondria")
    assert.deepEqual(
      a.map((r) => [r.id, r.relevance]),
      b.map((r) => [r.id, r.relevance])
    )
  })
})
