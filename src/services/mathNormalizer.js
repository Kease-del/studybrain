const LATEX_COMMAND = /\\[a-zA-Z]{2,}/

function containsLatexCommand(str) {
  return LATEX_COMMAND.test(str)
}

/**
 * Heuristic: is this line essentially pure math (LaTeX commands + math
 * symbols/operators) with no real English prose words?
 */
function isMathOnlyLine(line) {
  const t = line.trim()
  if (!t || t.length > 300) return false
  if (!containsLatexCommand(t)) return false
  if (t.includes("$")) return false

  const stripped = t
    .replace(/\\([a-zA-Z]+)/g, " ")
    .replace(/\{([^{}]*)\}/g, " $1 ")
    .replace(/[0-9.,;:={}[\](()<>+\-*/^_!|&%]/g, " ")

  const words = stripped.split(/\s+/).filter(Boolean)
  const prose = words.filter((w) => w.length > 2 && /[a-zA-Z]{3,}/.test(w))
  return prose.length === 0
}

/**
 * Normalizes AI math output before Markdown+KaTeX rendering so the user
 * never sees raw LaTeX commands or delimiter shorthands.
 *
 * Handles:
 *  - \[ ... \] and $$...$$  → display math
 *  - \( ... \) and $...$    → inline math
 *  - bare [ ... ] blocks containing LaTeX commands → display math
 *  - single pure-LaTeX lines with no delimiters → display math
 *  - stray spaces inside $ ... $ / $$ ... $$ so they parse
 */
export function normalizeMath(text) {
  if (!text) return text

  let out = text

  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, body) => `$$\n${body.trim()}\n$$`)
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, body) => `$${body.trim()}$`)

  const protectedRanges = [
    ...out.matchAll(/\$\$[\s\S]*?\$\$/g),
    ...out.matchAll(/\$[^\n$]+\$/g),
  ].map((m) => [m.index, m.index + m[0].length])

  out = out.replace(/\[([\s\S]*?)\]/g, (match, body, offset) => {
    if (protectedRanges.some(([s, e]) => offset >= s && offset < e)) return match
    let b = body.trim()
    b = b.replace(/^\$\$/, "").replace(/\$\$$/, "").replace(/^\$/, "").replace(/\$$/, "")
    if (containsLatexCommand(b) && b.length <= 2000) {
      return `$$\n${b.trim()}\n$$`
    }
    return match
  })

  const lines = out.split("\n")
  let insideDisplay = false
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t === "$$") {
      insideDisplay = !insideDisplay
      continue
    }
    if (insideDisplay) continue
    if (isMathOnlyLine(lines[i])) {
      lines[i] = `$$\n${lines[i].trim()}\n$$`
    }
  }
  out = lines.join("\n")

  out = out.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, body) => `$$\n${body.trim()}\n$$`)

  out = out.replace(/\$[ \t]*([^\n$]+?)[ \t]*\$/g, (match, body) =>
    body.includes("\\") ? `$${body.trim()}$` : match
  )

  return out
}
