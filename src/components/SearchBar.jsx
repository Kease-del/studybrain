import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Search, FileText, Database, Link, File, X } from "lucide-react"
import { useSearch } from "@/context/SearchContext"
import { highlightText } from "@/lib/highlight"
import { useMediaQuery, SMALL_SCREEN } from "@/hooks/useMediaQuery"

const CATEGORY_ICONS = {
  Notes: FileText,
  "Vault Text": Database,
  "Vault Links": Link,
  "Vault PDFs": File,
}

export default function SearchBar() {
  const { query, setQuery, results, open, setOpen, closeSearch, inputRef } =
    useSearch()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  // Drop the "(Ctrl+K)" hint in the placeholder on very small screens
  // (same 480px breakpoint as .hotkey-hint in responsive.css).
  const isSmallScreen = useMediaQuery(SMALL_SCREEN)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [setOpen])

  function handleSelect(item) {
    closeSearch()
    navigate(item.path)
  }

  const grouped = {}
  for (const r of results) {
    if (!grouped[r.category]) grouped[r.category] = []
    grouped[r.category].push(r)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-md"
      role="combobox"
      aria-expanded={open && query.trim() ? "true" : "false"}
      aria-haspopup="listbox"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={isSmallScreen ? "Search..." : "Search... (Ctrl+K)"}
          className="w-full rounded-lg border bg-background pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          aria-label="Search notes and resources"
          role="searchbox"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("")
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl border bg-card shadow-lg z-50 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
          role="listbox"
        >
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">
                No results found
              </p>
              <p className="text-sm text-muted-foreground">
                Try different keywords or add more notes and resources.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => {
              const Icon = CATEGORY_ICONS[category]
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {category}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60">
                      ({items.length})
                    </span>
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors"
                      role="option"
                    >
                      <p className="text-sm font-medium truncate">
                        {highlightText(item.title, query)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {highlightText(item.snippet, query)}
                      </p>
                    </button>
                  ))}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
