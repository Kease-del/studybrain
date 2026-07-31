export function highlightText(text, query) {
  if (!query.trim()) return text

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = text.split(new RegExp(`(${escaped})`, "gi"))

  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="rounded bg-yellow-200/60 text-foreground px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}
