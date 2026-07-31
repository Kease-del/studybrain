import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { normalizeMath } from "./mathNormalizer.js"

describe("normalizeMath", () => {
  it("wraps bare [ ... ] blocks containing LaTeX as display math", () => {
    assert.equal(
      normalizeMath("[ \\frac{dy}{dx}+P(x),y = Q(x) ]"),
      "$$\n\\frac{dy}{dx}+P(x),y = Q(x)\n$$"
    )
  })

  it("does not double-wrap already-delimited math", () => {
    const normalized = normalizeMath("\\[ \\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2} \\]")
    assert.equal(normalized, "$$\n\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}\n$$")
  })

  it("strips redundant $ delimiters inside bare [ ] blocks", () => {
    assert.equal(
      normalizeMath("[ $\\frac{dy}{dx}+P(x),y = Q(x)$ ]"),
      "$$\n\\frac{dy}{dx}+P(x),y = Q(x)\n$$"
    )
  })

  it("converts \\( \\) to inline math", () => {
    assert.equal(
      normalizeMath("The derivative is \\( \\frac{d}{dx}(x^2) = 2x \\) here."),
      "The derivative is $\\frac{d}{dx}(x^2) = 2x$ here."
    )
  })

  it("converts bare pure-math lines to display math", () => {
    assert.equal(normalizeMath("\\frac{dy}{dx} = 3x^2"), "$$\n\\frac{dy}{dx} = 3x^2\n$$")
  })

  it("does not wrap math inside an existing display block twice", () => {
    assert.equal(
      normalizeMath("$$\n\\frac{dy}{dx} = 3x^2\n$$"),
      "$$\n\\frac{dy}{dx} = 3x^2\n$$"
    )
  })

  it("keeps matrix environments inside display blocks intact", () => {
    assert.equal(
      normalizeMath("$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$"),
      "$$\n\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}\n$$"
    )
  })

  it("normalizes display math delimiters with spaces", () => {
    assert.equal(
      normalizeMath("$$ \\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6} $$"),
      "$$\n\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}\n$$"
    )
  })

  it("leaves prose lines with inline LaTeX commands unwrapped", () => {
    assert.equal(
      normalizeMath("The \\sqrt{2} is irrational, so we use it in proofs."),
      "The \\sqrt{2} is irrational, so we use it in proofs."
    )
  })

  it("leaves markdown links and citations alone", () => {
    assert.equal(
      normalizeMath("See [example](https://example.com) and citation [1]."),
      "See [example](https://example.com) and citation [1]."
    )
  })

  it("does not treat prose dollar amounts as math delimiters", () => {
    assert.equal(
      normalizeMath("That costs $5 and also $10 total."),
      "That costs $5 and also $10 total."
    )
  })

  it("returns falsy input unchanged", () => {
    assert.equal(normalizeMath(""), "")
    assert.equal(normalizeMath(null), null)
    assert.equal(normalizeMath(undefined), undefined)
  })
})
