import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/useAuth"
import {
  getStoredTheme,
  setStoredTheme,
  applyTheme,
  listenForSystemChanges,
  resolveTheme,
} from "@/services/theme"

export function useTheme() {
  const { user } = useAuth()
  const email = user?.email
  const [theme, setThemeState] = useState(() => getStoredTheme(email))
  const [resolved, setResolved] = useState(() => resolveTheme(theme))

  const setTheme = useCallback(
    (t) => {
      setStoredTheme(t, email)
      setThemeState(t)
      applyTheme(t)
      setResolved(resolveTheme(t))
    },
    [email]
  )

  useEffect(() => {
    applyTheme(theme)
    setResolved(resolveTheme(theme))

    if (theme === "system") {
      const unsub = listenForSystemChanges(() => {
        applyTheme("system")
        setResolved(resolveTheme("system"))
      })
      return unsub
    }
  }, [theme])

  return { theme, resolved, setTheme }
}
