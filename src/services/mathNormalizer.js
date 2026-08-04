const LATEX_COMMAND = /\\[a-zA-Z]{2,}/

// Structural/text LaTeX commands that must never be wrapped as inline math.
const INLINE_EXCLUDED = new Set([
  "text",
  "textrm",
  "textit",
  "textbf",
  "textsf",
  "texttt",
  "emph",
  "mbox",
  "fbox",
  "parbox",
  "makebox",
  "hspace",
  "vspace",
  "hskip",
  "vskip",
  "hfill",
  "vfill",
  "quad",
  "qquad",
  "newline",
  "linebreak",
  "pagebreak",
  "bigskip",
  "medskip",
  "smallskip",
  "noindent",
  "indent",
  "begin",
  "end",
  "label",
  "ref",
  "eqref",
  "cite",
  "url",
  "href",
  "includegraphics",
  "input",
  "include",
  "usepackage",
  "documentclass",
  "section",
  "subsection",
  "subsubsection",
  "item",
  "caption",
  "title",
  "author",
  "date",
  "left",
  "right",
  "big",
  "Big",
  "bigg",
  "Bigg",
])

// Standalone math commands (no brace arguments required) safe to wrap inline.
const KNOWN_MATH_COMMAND = new Set([
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "varepsilon",
  "zeta",
  "eta",
  "theta",
  "vartheta",
  "iota",
  "kappa",
  "lambda",
  "mu",
  "nu",
  "xi",
  "pi",
  "rho",
  "varrho",
  "sigma",
  "varsigma",
  "tau",
  "upsilon",
  "phi",
  "varphi",
  "chi",
  "psi",
  "omega",
  "Gamma",
  "Delta",
  "Theta",
  "Lambda",
  "Xi",
  "Pi",
  "Sigma",
  "Upsilon",
  "Phi",
  "Psi",
  "Omega",
  "pm",
  "mp",
  "times",
  "div",
  "cdot",
  "ast",
  "star",
  "circ",
  "bullet",
  "cap",
  "cup",
  "setminus",
  "emptyset",
  "varnothing",
  "in",
  "notin",
  "ni",
  "subset",
  "subseteq",
  "nsubseteq",
  "supset",
  "supseteq",
  "nsupseteq",
  "subsetneq",
  "supsetneq",
  "wedge",
  "vee",
  "oplus",
  "otimes",
  "ominus",
  "oslash",
  "odot",
  "infty",
  "partial",
  "nabla",
  "forall",
  "exists",
  "nexists",
  "neg",
  "lnot",
  "land",
  "lor",
  "top",
  "bot",
  "to",
  "gets",
  "leftarrow",
  "rightarrow",
  "leftrightarrow",
  "Leftarrow",
  "Rightarrow",
  "Leftrightarrow",
  "mapsto",
  "longrightarrow",
  "longleftarrow",
  "longleftrightarrow",
  "uparrow",
  "downarrow",
  "updownarrow",
  "Uparrow",
  "Downarrow",
  "leq",
  "geq",
  "neq",
  "ne",
  "approx",
  "equiv",
  "cong",
  "sim",
  "simeq",
  "propto",
  "asymp",
  "prec",
  "succ",
  "preceq",
  "succeq",
  "ll",
  "gg",
  "le",
  "ge",
  "sum",
  "prod",
  "int",
  "iint",
  "iiint",
  "oint",
  "lim",
  "log",
  "ln",
  "exp",
  "max",
  "min",
  "sup",
  "inf",
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "cdots",
  "ldots",
  "dots",
  "vdots",
  "ddots",
])

const BRACE_GROUP = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/
const SQBRACKET_GROUP = /\[[^[\]]*\]/
const INLINE_LATEX = new RegExp(
  `\\\\[a-zA-Z]{2,}(?:[ \\t]*${BRACE_GROUP.source}|[ \\t]*${SQBRACKET_GROUP.source})*`,
  "g"
)

function containsLatexCommand(str) {
  return LATEX_COMMAND.test(str)
}

/**
 * Wraps bare inline LaTeX command invocations (e.g. `\frac{225}{100}`) that
 * appear inside a prose sentence in `$ ... $` so KaTeX renders them instead of
 * showing raw command text. Windows paths, markdown escapes and structural
 * commands are left untouched.
 */
function wrapInlineLatex(line) {
  return line.replace(INLINE_LATEX, (match) => {
    const cmd = match.match(/\\[a-zA-Z]{2,}/)[0].slice(1)
    if (INLINE_EXCLUDED.has(cmd)) return match
    const hasArgs = match.length > 1 + cmd.length
    if (hasArgs || KNOWN_MATH_COMMAND.has(cmd)) return `$${match}$`
    return match
  })
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

const NUL = String.fromCharCode(0)
const FENCE_PLACEHOLDER = (i) => `${NUL}SBFENCE${i}${NUL}`
const FENCE_RE = new RegExp(`${NUL}SBFENCE(\\d+)${NUL}`, "g")

/**
 * Temporarily removes fenced code blocks so delimiter/math normalization never
 * corrupts code. Returns the stripped text plus the extracted fences.
 */
function extractFences(text) {
  const lines = text.split("\n")
  const parts = []
  const fences = []
  let i = 0
  while (i < lines.length) {
    const m = lines[i].match(/^\s*(`{3,}|~{3,})\s*$/)
    if (m) {
      const marker = m[1]
      const open = lines[i]
      const buf = [open]
      i++
      const closer = marker.startsWith("`") ? /^`{3,}\s*$/ : /^~{3,}\s*$/
      while (i < lines.length) {
        buf.push(lines[i])
        if (closer.test(lines[i].trim())) {
          i++
          break
        }
        i++
      }
      const idx = fences.length
      fences.push(buf.join("\n"))
      parts.push(FENCE_PLACEHOLDER(idx))
    } else {
      parts.push(lines[i])
      i++
    }
  }
  return { text: parts.join("\n"), fences }
}

function restoreFences(text, fences) {
  return text.replace(FENCE_RE, (_, i) => fences[Number(i)] ?? "")
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
 *  - bare inline commands (e.g. `\frac{225}{100}`) inside prose → `$...$`
 */
export function normalizeMath(text) {
  if (!text) return text

  const { text: stripped, fences } = extractFences(text)
  let out = stripped

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
    } else if (!lines[i].includes("$")) {
      lines[i] = wrapInlineLatex(lines[i])
    }
  }
  out = lines.join("\n")

  out = out.replace(
    /^([ \t]*)\$\$(?:\s*\n?)([\s\S]*?)(?:\n?\s*)\$\$[ \t]*(?=\n|$)/gm,
    (_match, indent, body) => {
      const prefix = indent
      return `${prefix}$$\n${body.trim().split("\n").map((line) => prefix + line).join("\n")}\n${prefix}$$`
    }
  )

  out = out.replace(/\$[ \t]*([^\n$]+?)[ \t]*\$/g, (match, body) =>
    body.includes("\\") ? `$${body.trim()}$` : match
  )

  return restoreFences(out, fences)
}
