import { useCallback, useEffect, useRef, useState } from "react"
import {
  Brain,
  Lightbulb,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Database,
  Target,
  MessageSquare,
  Settings,
  User,
  Send,
  Check,
  Loader2,
  AlertCircle,
  Sun,
  Monitor,
  Moon,
} from "lucide-react"
import { getSupabase } from "./lib/supabase"
import "./App.css"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STORAGE_KEY = "sb-theme"

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") return stored
  } catch { /* SSR / private browsing */ }
  return "system"
}

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === "light") {
    root.classList.remove("dark")
  } else if (theme === "dark") {
    root.classList.add("dark")
  } else {
    // system
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    root.classList.toggle("dark", prefersDark)
  }
}

function ThemeSwitcher() {
  const [theme, setTheme] = useState(getInitialTheme)
  const mqlRef = useRef(null)

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* ignore */ }
  }, [theme])

  // Listen for OS preference changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") {
      if (mqlRef.current) {
        mqlRef.current.removeEventListener("change", mqlRef.current._handler)
        mqlRef.current = null
      }
      return
    }

    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme("system")
    mql.addEventListener("change", handler)
    mqlRef.current = mql
    mql._handler = handler

    return () => mql.removeEventListener("change", handler)
  }, [theme])

  const cycle = useCallback(() => {
    setTheme((prev) => {
      if (prev === "light") return "dark"
      if (prev === "dark") return "system"
      return "light"
    })
  }, [])

  return (
    <div className="theme-switcher" role="radiogroup" aria-label="Theme">
      <button
        className="theme-btn"
        onClick={cycle}
        aria-label={`Theme: ${theme}. Click to cycle.`}
        title={`Theme: ${theme}`}
      >
        {theme === "light" && <Sun size={16} />}
        {theme === "dark" && <Moon size={16} />}
        {theme === "system" && <Monitor size={16} />}
      </button>
    </div>
  )
}

function App() {
  const waitlistRef = useRef(null)
  const featuresRef = useRef(null)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")

  function scrollToWaitlist() {
    waitlistRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  function scrollToFeatures() {
    featuresRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = email.trim()

    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setStatus("error")
      setErrorMsg("Please enter a valid email address.")
      return
    }

    setLoading(true)
    setStatus(null)
    setErrorMsg("")

    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from("waitlist_signups")
        .insert({ email: trimmed.toLowerCase() })

      if (error) {
        if (error.code === "23505") {
          setStatus("duplicate")
          setErrorMsg("")
        } else {
          setStatus("error")
          setErrorMsg(error.message || "Something went wrong. Please try again.")
        }
      } else {
        setStatus("success")
        setEmail("")
      }
    } catch (err) {
      setStatus("error")
      setErrorMsg(err.message || "Could not connect. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="landing">
      <nav className="nav">
        <div className="brand">
          <div className="brand-mark">
            <Brain size={20} strokeWidth={2.5} />
          </div>
          <span>StudyBrain</span>
        </div>

        <div className="nav-actions">
          <ThemeSwitcher />
          <button className="nav-link">Log in</button>
          <button className="nav-button">Sign up</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">THE AI STUDY WORKSPACE</div>

          <h1>
            Study smarter.
            <br />
            <span>Remember more.</span>
          </h1>

          <p className="hero-text">
            StudyBrain brings your notes, resources, and AI conversations
            together, so your AI can actually understand what you're studying.
          </p>

          <div className="hero-actions">
            <button className="primary-button" onClick={scrollToWaitlist}>
              Join the waitlist
            </button>
            <button className="secondary-button" onClick={scrollToFeatures}>
              See what's coming
            </button>
          </div>

          <p className="availability">Early access coming soon.</p>
        </div>

        <div className="hero-visual">
          <div className="app-window">
            <div className="window-top">
              <div className="window-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="window-title">StudyBrain</div>
            </div>

            <div className="mock-content">
              <aside className="mock-sidebar">
                <div className="mock-sidebar-brand">
                  <div className="mock-sidebar-logo">
                    <Brain size={16} strokeWidth={2.5} />
                  </div>
                  <span className="mock-sidebar-name">StudyBrain</span>
                </div>

                <nav className="mock-sidebar-nav">
                  <div className="mock-nav-item">
                    <LayoutDashboard size={16} />
                    <span>Dashboard</span>
                  </div>
                  <div className="mock-nav-item">
                    <FileText size={16} />
                    <span>Notes</span>
                  </div>
                  <div className="mock-nav-item">
                    <Database size={16} />
                    <span>Vault</span>
                  </div>
                  <div className="mock-nav-item">
                    <Target size={16} />
                    <span>Goals</span>
                  </div>
                  <div className="mock-nav-item active">
                    <MessageSquare size={16} />
                    <span>Chat</span>
                  </div>
                  <div className="mock-nav-item">
                    <Settings size={16} />
                    <span>Settings</span>
                  </div>
                </nav>

                <div className="mock-sidebar-user">
                  <div className="mock-user-avatar">
                    <User size={14} />
                  </div>
                  <div className="mock-user-info">
                    <span className="mock-user-name">Alex</span>
                    <span className="mock-user-email">alex@university.edu</span>
                  </div>
                </div>
              </aside>

              <div className="mock-chat">
                <div className="mock-chat-header">
                  <div className="mock-chat-title">Data Structures</div>
                  <div className="mock-chat-meta">Today &middot; 4 messages</div>
                </div>

                <div className="mock-messages">
                  <div className="mock-message-row mock-message-user">
                    <div className="mock-avatar mock-avatar-user">
                      <User size={14} />
                    </div>
                    <div className="mock-bubble mock-bubble-user">
                      What does Professor Smith usually ask about red-black trees on the exam?
                    </div>
                  </div>

                  <div className="mock-message-row mock-message-ai">
                    <div className="mock-avatar mock-avatar-ai">
                      <Brain size={14} />
                    </div>
                    <div className="mock-bubble mock-bubble-ai">
                      Based on your notes and past exams, Professor Smith typically asks about rotations and balance properties. Question 3 often requires you to trace through an insertion and explain why it maintains BST order.
                      <div className="mock-citations">
                        <span className="mock-cite">
                          <span className="mock-cite-icon">&#128221;</span>
                          <span>[1] Lecture 14 Notes</span>
                        </span>
                        <span className="mock-cite">
                          <span className="mock-cite-icon">&#128451;</span>
                          <span>[2] DS Final 2024</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mock-input-bar">
                  <div className="mock-input-field">
                    Type your message...
                  </div>
                  <div className="mock-send-btn">
                    <Send size={14} />
                    Send
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="value-section" ref={featuresRef}>
        <div className="section-label">WHY STUDYBRAIN</div>
        <h2>Your AI should know what you're studying.</h2>
        <p>
          Your study material shouldn't disappear into separate folders and
          disconnected conversations.
        </p>

        <div className="feature-grid">
          <article>
            <div className="feature-icon">
              <Lightbulb size={22} />
            </div>
            <h3>Context-aware AI</h3>
            <p>
              Ask questions and get answers grounded in the material you've
              actually saved.
            </p>
          </article>

          <article>
            <div className="feature-icon">
              <FileText size={22} />
            </div>
            <h3>Your notes</h3>
            <p>
              Keep your explanations, ideas, and study notes connected to your
              conversations.
            </p>
          </article>

          <article>
            <div className="feature-icon">
              <FolderOpen size={22} />
            </div>
            <h3>Your resources</h3>
            <p>
              Save useful documents and resources, then find the information
              you need when you need it.
            </p>
          </article>
        </div>
      </section>

      <section className="waitlist-section" ref={waitlistRef}>
        <div className="waitlist-card">
          <div className="section-label">EARLY ACCESS</div>
          <h2>Be one of the first to try StudyBrain.</h2>
          <p>
            Join the waitlist and we'll let you know when early access opens.
          </p>

          {status === "success" ? (
            <div className="waitlist-status waitlist-success">
              <Check size={18} />
              <span>You're on the list! We'll be in touch.</span>
            </div>
          ) : status === "duplicate" ? (
            <div className="waitlist-status waitlist-duplicate">
              <Check size={18} />
              <span>This email is already on the waitlist.</span>
            </div>
          ) : (
            <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
              <input
                type="email"
                placeholder="you@example.com"
                aria-label="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status === "error") setStatus(null)
                }}
                disabled={loading}
                className={status === "error" ? "input-error" : ""}
              />
              <button type="submit" disabled={loading}>
                {loading ? (
                  <span className="btn-loading">
                    <Loader2 size={16} className="spin" />
                    Joining...
                  </span>
                ) : (
                  "Join waitlist"
                )}
              </button>
            </form>
          )}

          {status === "error" && errorMsg && (
            <div className="waitlist-status waitlist-error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </section>

      <footer>
        <div className="brand">
          <div className="brand-mark">
            <Brain size={16} strokeWidth={2.5} />
          </div>
          <span>StudyBrain</span>
        </div>
        <span>Building in public.</span>
      </footer>
    </main>
  )
}

export default App
