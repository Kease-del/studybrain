import { createContext, useContext, useState, useMemo, useCallback } from "react"
import { useNotes } from "@/hooks/useNotes"
import { useVault } from "@/hooks/useVault"

const SearchContext = createContext(null)

function searchItems(query, notes, vault) {
  if (!query.trim()) return []

  const q = query.toLowerCase()
  const results = []

  for (const note of notes) {
    if (
      note.text.toLowerCase().includes(q)
    ) {
      const idx = note.text.toLowerCase().indexOf(q)
      results.push({
        id: note.id,
        title: note.text.slice(0, 60) + (note.text.length > 60 ? "..." : ""),
        snippet: note.text,
        matchStart: idx,
        matchEnd: idx + q.length,
        category: "Notes",
        path: "/notes",
      })
    }
  }

  for (const item of vault) {
    const titleMatch = item.title.toLowerCase().includes(q)

    if (item.type === "text" && (titleMatch || item.content?.toLowerCase().includes(q))) {
      const content = item.content || ""
      const idx = titleMatch
        ? item.title.toLowerCase().indexOf(q)
        : content.toLowerCase().indexOf(q)
      results.push({
        id: item.id,
        title: item.title,
        snippet: titleMatch ? content : content,
        matchStart: idx,
        matchEnd: idx + q.length,
        category: "Vault Text",
        path: "/vault",
      })
    } else if (item.type === "link" && (titleMatch || item.url?.toLowerCase().includes(q))) {
      const url = item.url || ""
      const idx = titleMatch
        ? item.title.toLowerCase().indexOf(q)
        : url.toLowerCase().indexOf(q)
      results.push({
        id: item.id,
        title: item.title,
        snippet: url,
        matchStart: idx,
        matchEnd: idx + q.length,
        category: "Vault Links",
        path: "/vault",
      })
    } else if (item.type === "pdf" && (titleMatch || item.filename?.toLowerCase().includes(q))) {
      const filename = item.filename || ""
      const idx = titleMatch
        ? item.title.toLowerCase().indexOf(q)
        : filename.toLowerCase().indexOf(q)
      results.push({
        id: item.id,
        title: item.title,
        snippet: filename,
        matchStart: idx,
        matchEnd: idx + q.length,
        category: "Vault PDFs",
        path: "/vault",
      })
    }
  }

  return results
}

export function SearchProvider({ children }) {
  const { notes } = useNotes()
  const { items: vault } = useVault()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const results = useMemo(
    () => searchItems(query, notes, vault),
    [query, notes, vault]
  )

  const closeSearch = useCallback(() => {
    setOpen(false)
    setQuery("")
  }, [])

  return (
    <SearchContext.Provider
      value={{ query, setQuery, results, open, setOpen, closeSearch }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error("useSearch must be used within SearchProvider")
  return ctx
}
