// useMediaQuery — reactively tells us whether a CSS media query matches.
// We use it to drop keyboard-shortcut hints (Ctrl+K, Ctrl+Enter) on very
// small screens where a physical keyboard doesn't exist.
//
// NOTE: SMALL_SCREEN must stay in sync with the @media (max-width: 480px)
// breakpoint used for .hotkey-hint in src/styles/responsive.css.
import { useState, useEffect } from "react"

// "Very small screens" — same 480px breakpoint as responsive.css.
export const SMALL_SCREEN = "(max-width: 480px)"

export function useMediaQuery(query) {
  // Start with the current value so there's no flash on first render.
  const [matches, setMatches] = useState(() =>
    window.matchMedia(query).matches
  )

  // Subscribe to media-query changes. setMatches only runs inside the
  // listener (a callback), never synchronously inside the effect body.
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handleChange = () => setMatches(mql.matches)
    mql.addEventListener("change", handleChange)
    return () => mql.removeEventListener("change", handleChange)
  }, [query])

  return matches
}
