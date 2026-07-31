const THEME_KEY = "studybrain_theme"
const VALID_THEMES = ["light", "dark", "system"]

function themeKeyFor(email) {
  return email ? `${THEME_KEY}_${email}` : THEME_KEY
}

function getSystemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function getStoredTheme(email) {
  const key = themeKeyFor(email)
  try {
    let t = localStorage.getItem(key)
    if (t === null && email) {
      const legacy = localStorage.getItem(THEME_KEY)
      if (legacy !== null) {
        t = legacy
        localStorage.setItem(key, legacy)
        localStorage.removeItem(THEME_KEY)
      }
    }
    return VALID_THEMES.includes(t) ? t : "system"
  } catch {
    return "system"
  }
}

export function setStoredTheme(theme, email) {
  if (!VALID_THEMES.includes(theme)) return
  localStorage.setItem(themeKeyFor(email), theme)
}

export function applyTheme(theme) {
  const resolved = theme === "system" ? getSystemPrefersDark() : theme === "dark"
  document.documentElement.classList.toggle("dark", resolved)
}

export function listenForSystemChanges(onChange) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  const handler = () => onChange()
  mq.addEventListener("change", handler)
  return () => mq.removeEventListener("change", handler)
}

export function resolveTheme(theme) {
  if (theme === "system") {
    return getSystemPrefersDark() ? "dark" : "light"
  }
  return theme
}
