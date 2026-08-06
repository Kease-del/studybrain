import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { cosineSimilarity } from "./cosineSimilarity.js"

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1)
    assert.equal(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1)
  })

  it("returns 0 for orthogonal vectors", () => {
    assert.equal(cosineSimilarity([1, 0, 0], [0, 1, 0]), 0)
    assert.equal(cosineSimilarity([1, 2, 3], [-2, 1, 0]), 0)
  })

  it("returns -1 for opposite vectors", () => {
    assert.equal(cosineSimilarity([1, 0, 0], [-1, 0, 0]), -1)
    assert.equal(cosineSimilarity([1, 2, 3], [-1, -2, -3]), -1)
  })

  it("is symmetric", () => {
    assert.equal(
      cosineSimilarity([3, 4, 0], [1, 2, 0]),
      cosineSimilarity([1, 2, 0], [3, 4, 0])
    )
  })

  it("is invariant to scaling", () => {
    assert.equal(cosineSimilarity([1, 2, 3], [4, 5, 6]), cosineSimilarity([2, 4, 6], [8, 10, 12]))
  })

  it("returns 0 for unequal lengths", () => {
    assert.equal(cosineSimilarity([1, 0], [1, 0, 0]), 0)
    assert.equal(cosineSimilarity([1, 0, 0], [1, 0]), 0)
    assert.equal(cosineSimilarity([], [1, 0, 0]), 0)
  })

  it("returns 0 for empty vectors", () => {
    assert.equal(cosineSimilarity([], []), 0)
  })

  it("returns 0 for non-array or null inputs", () => {
    assert.equal(cosineSimilarity(null, [1, 0]), 0)
    assert.equal(cosineSimilarity([1, 0], undefined), 0)
    assert.equal(cosineSimilarity("abc", [1, 0]), 0)
  })

  it("ranks a closer vector higher than a farther one", () => {
    const base = [1, 0, 0]
    const close = [0.9, 0.1, 0]
    const far = [0.1, 0.9, 0]
    assert.ok(cosineSimilarity(base, close) > cosineSimilarity(base, far))
    assert.ok(cosineSimilarity(base, far) > cosineSimilarity(base, [0, 1, 0]))
    assert.ok(cosineSimilarity(base, [0, 1, 0]) > cosineSimilarity(base, [-0.1, 0.9, 0]))
  })

  it("returns a value in [-1, 1] for arbitrary inputs", () => {
    const EPS = 1e-12
    for (const [a, b] of [
      [[3, 1, 4], [1, 5, 9]],
      [[-2, 5, 1], [0, -3, 8]],
      [[1, 1, 1], [-1, -1, -1]],
    ]) {
      const score = cosineSimilarity(a, b)
      assert.ok(score >= -1 - EPS && score <= 1 + EPS)
    }
  })
})
