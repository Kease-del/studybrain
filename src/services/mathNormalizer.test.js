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

  it("wraps bare inline LaTeX commands inside prose as inline math", () => {
    assert.equal(
      normalizeMath("2. Reduce the fraction \\frac{225}{100} to its simplest form."),
      "2. Reduce the fraction $\\frac{225}{100}$ to its simplest form."
    )
  })

  it("wraps multiple inline commands and keeps surrounding prose", () => {
    assert.equal(
      normalizeMath("Note that \\frac{225}{100} = \\frac{9}{4}, so 2.25 = 9/4."),
      "Note that $\\frac{225}{100}$ = $\\frac{9}{4}$, so 2.25 = 9/4."
    )
  })

  it("leaves prose lines with inline LaTeX commands unwrapped", () => {
    assert.equal(
      normalizeMath("The \\sqrt{2} is irrational, so we use it in proofs."),
      "The $\\sqrt{2}$ is irrational, so we use it in proofs."
    )
  })

  it("does not wrap Windows paths as math", () => {
    assert.equal(
      normalizeMath("Save the file to C:\\Users\\timil\\Documents\\notes.txt."),
      "Save the file to C:\\Users\\timil\\Documents\\notes.txt."
    )
  })

  it("leaves fenced code blocks untouched", () => {
    assert.equal(
      normalizeMath("Here is code:\n```\nconst f = \\frac{225}{100};\n// path C:\\Users\\x\n```\nDone."),
      "Here is code:\n```\nconst f = \\frac{225}{100};\n// path C:\\Users\\x\n```\nDone."
    )
  })

  it("does not wrap structural or text commands", () => {
    assert.equal(
      normalizeMath("Use \\textbf{bold} and \\textit{italic} here."),
      "Use \\textbf{bold} and \\textit{italic} here."
    )
  })

  it("wraps bare known math symbols inline", () => {
    assert.equal(
      normalizeMath("The value of \\pi is about 3.14159."),
      "The value of $\\pi$ is about 3.14159."
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

  it("keeps display math indented to the list column inside list items", () => {
    assert.equal(
      normalizeMath(
        "- Write 2.25 as a fraction.\n  $$2.25 = \\frac{225}{100}$$\n- Reduce it.\n  $$\\frac{225 \\div 25}{100 \\div 25}= \\frac{9}{4}$$"
      ),
      "- Write 2.25 as a fraction.\n  $$\n  2.25 = \\frac{225}{100}\n  $$\n- Reduce it.\n  $$\n  \\frac{225 \\div 25}{100 \\div 25}= \\frac{9}{4}\n  $$"
    )
  })

  it("does not swallow list prose into display math across list items", () => {
    const input = [
      "- Write the decimal as a fraction over a power of 10.  ",
      "  $$2.25 = \\frac{225}{100}$$",
      "- Reduce the fraction by dividing numerator and denominator.  ",
      "  The GCD of 225 and 100 is 25.  ",
      "",
      "  $$\\frac{225 \\div 25}{100 \\div 25}= \\frac{9}{4}$$",
      "",
      "So  ",
      "",
      "\\[",
      "2.25 = \\frac{9}{4}",
      "\\]",
    ].join("\n")
    const expected = [
      "- Write the decimal as a fraction over a power of 10.  ",
      "  $$",
      "  2.25 = \\frac{225}{100}",
      "  $$",
      "- Reduce the fraction by dividing numerator and denominator.  ",
      "  The GCD of 225 and 100 is 25.  ",
      "",
      "  $$",
      "  \\frac{225 \\div 25}{100 \\div 25}= \\frac{9}{4}",
      "  $$",
      "",
      "So  ",
      "",
      "$$",
      "2.25 = \\frac{9}{4}",
      "$$",
    ].join("\n")
    assert.equal(normalizeMath(input), expected)
  })
})
