import { useState, useCallback, useEffect, useRef } from "react"
import {
  sendChatMessage,
  getContentBudgetForMessages,
  summarizeConversation,
} from "@/services/ai"
import { trackChatMessage, resetChatSession, migrateChatSessions } from "@/services/analytics"
import { retrieveRelevantKnowledge, extractPageRefs } from "@/services/retriever"
import { retrieveVaultResources, buildVaultResourcesSection } from "@/services/vaultRetrieval"
import { splitPageBatches } from "@/services/contextBuilder"
import { trimHistory, partitionMessagesForSummary } from "@/services/history"
import { isAskingAboutKnowledge, getKnowledgeDomain } from "@/services/queryIntent"
import { useAuth } from "./useAuth"
import { useNotes } from "./useNotes"
import { useVault } from "./useVault"
import { getChatProvider, isSupabaseChat } from "@/services/chat"
import { migrateLocalChatToSupabase } from "@/services/chat/migrate"

const NO_KNOWLEDGE_PREFIX =
  "I couldn't find anything about that in your saved notes or resources."

const ACTIVE_SESSION_KEY = (email) => `studybrain_chat_active_session_${email}`

const SUMMARY_TRIGGER = 30
const RECENT_MESSAGES_TO_KEEP = 12

function byUpdatedAtDesc(list) {
  return [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

function titleFromPrompt(content) {
  const normalized = String(content || "").replace(/\s+/g, " ").trim()
  if (normalized.length <= 40) return normalized
  return `${normalized.slice(0, 37).trimEnd()}...`
}

function migrateLegacyMessages(user, sessionId, provider) {
  const email = user?.email
  const legacy = localStorage.getItem(`studybrain_chat_${email}`) ?? localStorage.getItem("studybrain_chat")
  let messages = []
  if (legacy !== null) {
    try {
      const parsed = JSON.parse(legacy)
      if (Array.isArray(parsed)) messages = parsed
    } catch {
      messages = []
    }
  }
  if (messages.length > 0) {
    Promise.resolve(provider.saveMessages(user, sessionId, messages)).catch(
      (err) => console.error("Failed to save legacy messages:", err.message)
    )
  }
  localStorage.removeItem(`studybrain_chat_${email}`)
  localStorage.removeItem("studybrain_chat")
}

export function useChat() {
  const { notes } = useNotes()
  const { items: vaultItems } = useVault()
  const { user } = useAuth()
  const email = user?.email
  const provider = getChatProvider()

  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [summary, setSummary] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const activeSessionIdRef = useRef(null)
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  const sessionsRef = useRef([])
  useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  const messagesRef = useRef([])
  const summaryAttemptedRef = useRef(false)

  useEffect(() => {
    migrateChatSessions(email)
  }, [email])

  useEffect(() => {
    if (!email) {
      setSessions([])
      setActiveSessionId(null)
      setMessages([])
      messagesRef.current = []
      setSummary("")
      return
    }
    let disposed = false
    async function bootstrap() {
      try {
        if (isSupabaseChat) {
          await migrateLocalChatToSupabase(user)
        }

        let list = await provider.getSessions(user)

        if (list.length === 0) {
          const session = await provider.createSession(user, "New Chat")
          migrateLegacyMessages(user, session.id, provider)
          list = await provider.getSessions(user)
        }

        if (disposed) return
        setSessions(byUpdatedAtDesc(list))

        let active = localStorage.getItem(ACTIVE_SESSION_KEY(email))
        if (!active || !list.some((s) => s.id === active)) {
          active = list[0]?.id
        }
        setActiveSessionId(active)
        localStorage.setItem(ACTIVE_SESSION_KEY(email), active)
        const msgs = await provider.getMessages(user, active)
        messagesRef.current = msgs
        setMessages(msgs)
        setSummary(await provider.getSummary(user, active))
      } catch (err) {
        console.error("Failed to load chat sessions:", err.message)
        if (disposed) return
        setSessions([])
        setActiveSessionId(null)
        setMessages([])
        messagesRef.current = []
        setSummary("")
      }
    }
    bootstrap()
    return () => {
      disposed = true
    }
  }, [email, user, provider])

  const addMessage = useCallback(
    (content, role, metadata) => {
      const msg = {
        id: crypto.randomUUID(),
        role,
        content,
        ...(metadata ? { metadata } : {}),
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => {
        const updated = [...prev, msg]
        messagesRef.current = updated
        const sid = activeSessionIdRef.current
        if (user && sid) {
          Promise.resolve(provider.saveMessages(user, sid, updated)).catch(
            (err) => console.error("Failed to save messages:", err.message)
          )
        }
        return updated
      })
    },
    [user, provider]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    messagesRef.current = []
    const sid = activeSessionIdRef.current
    if (user && sid) {
      Promise.resolve(provider.saveMessages(user, sid, [])).catch((err) =>
        console.error("Failed to clear messages:", err.message)
      )
    }
    resetChatSession(email)
  }, [user, provider, email])

  const createSession = useCallback(
    async (title = "New Chat") => {
      if (!user) return null
      const session = await provider.createSession(user, title)
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(session.id)
      setMessages([])
      messagesRef.current = []
      setSummary("")
      localStorage.setItem(ACTIVE_SESSION_KEY(email), session.id)
      return session
    },
    [user, provider, email]
  )

  const renameSession = useCallback(
    async (id, title) => {
      if (!user || !id) return
      const trimmed = String(title ?? "").trim()
      if (!trimmed) return
      await provider.renameSession(user, id, trimmed)
      setSessions((prev) =>
        byUpdatedAtDesc(
          prev.map((s) =>
            s.id === id
              ? { ...s, title: trimmed, updatedAt: new Date().toISOString() }
              : s
          )
        )
      )
    },
    [user, provider]
  )

  const bumpSessionActivity = useCallback(
    async (id, query) => {
      if (!user || !id) return
      const s = sessionsRef.current.find((x) => x.id === id)
      if (!s) return
      const now = new Date().toISOString()
      const shouldAutoTitle = s.title === "New Chat"
      const title = shouldAutoTitle ? titleFromPrompt(query) : s.title
      await provider.renameSession(user, id, title)
      setSessions((prev) =>
        byUpdatedAtDesc(
          prev.map((x) => (x.id === id ? { ...x, title, updatedAt: now } : x))
        )
      )
    },
    [user, provider]
  )

  const deleteSession = useCallback(
    async (id) => {
      if (!user) return
      await provider.deleteSession(user, id)
      const list = byUpdatedAtDesc(await provider.getSessions(user))
      setSessions(list)
      if (activeSessionIdRef.current === id) {
        let next = list[0]?.id
        if (list.length === 0) {
          const session = await provider.createSession(user, "New Chat")
          setSessions([session])
          next = session.id
        }
        setActiveSessionId(next)
        const msgs = next ? await provider.getMessages(user, next) : []
        messagesRef.current = msgs
        setMessages(msgs)
        setSummary(next ? await provider.getSummary(user, next) : "")
        localStorage.setItem(ACTIVE_SESSION_KEY(email), next)
      }
    },
    [user, provider, email]
  )

  const setActiveSession = useCallback(
    async (id) => {
      if (!user || !id) return
      if (id === activeSessionIdRef.current) return
      localStorage.setItem(ACTIVE_SESSION_KEY(email), id)
      setActiveSessionId(id)
      const msgs = await provider.getMessages(user, id)
      messagesRef.current = msgs
      setMessages(msgs)
      setSummary(await provider.getSummary(user, id))
    },
    [user, provider, email]
  )

  const saveMessages = useCallback(
    (sessionId, msgs) => {
      if (user) {
        Promise.resolve(provider.saveMessages(user, sessionId, msgs)).catch(
          (err) => console.error("Failed to save messages:", err.message)
        )
      }
    },
    [user, provider]
  )

  const summarizeIfNeeded = useCallback(async () => {
    const sid = activeSessionIdRef.current
    if (!email || !sid) return
    if (summaryAttemptedRef.current) return

    const partition = partitionMessagesForSummary(
      messagesRef.current,
      SUMMARY_TRIGGER,
      RECENT_MESSAGES_TO_KEEP
    )
    if (!partition) return
    const { toSummarize, keep } = partition

    summaryAttemptedRef.current = true
    const existingSummary = await provider.getSummary(user, sid)
    let text
    try {
      text = await summarizeConversation(toSummarize, existingSummary)
    } catch {
      return
    }
    if (!text || !text.trim()) return

    await provider.saveSummary(user, sid, text.trim())
    await provider.saveMessages(user, sid, keep)
    messagesRef.current = keep
    setSummary(text.trim())
    setMessages(keep)
  }, [email, user, provider])

  const sendMessage = useCallback(
    async (content) => {
      if (!content.trim()) return

      trackChatMessage(email)

      const query = content.trim()
      addMessage(query, "user")
      bumpSessionActivity(activeSessionIdRef.current, query)
      setIsTyping(true)
      summaryAttemptedRef.current = false

      try {
        const pageRefs = extractPageRefs(query)
        const asking = isAskingAboutKnowledge(query) || pageRefs.length > 0
        const domain = getKnowledgeDomain(query)

        let relevantNotes = []
        let relevantVault = []
        let relevant = []

        if (asking) {
          relevant = retrieveRelevantKnowledge(query, notes, vaultItems)
          relevantNotes = relevant
            .filter((r) => r.type === "note")
            .map((r) => r.item)
          relevantVault = relevant
            .filter((r) => r.type === "vault")
            .map((r) => r.item)

          if (domain === "notes") relevantVault = []
          if (domain === "vault") relevantNotes = []

          if (relevantNotes.length === 0 && relevantVault.length === 0) {
            if (domain !== "vault") relevantNotes = notes ?? []
            if (domain !== "notes") relevantVault = vaultItems ?? []
          }
        }

        const hasNotes = relevantNotes.length > 0
        const hasVault = relevantVault.length > 0

        const matchedChunksMap = {}
        const pageChunksMap = {}
        for (const r of relevant) {
          if (r.matchedChunks?.length) {
            matchedChunksMap[r.id] = r.matchedChunks
          }
          if (r.pageChunks?.length) {
            pageChunksMap[r.id] = r.pageChunks
          }
        }

        const conversation = [...messages, { role: "user", content: query }]
        let trimmed = trimHistory(conversation)
        if (summary) {
          trimmed = [
            { role: "system", content: `Conversation Summary:\n${summary}` },
            ...trimmed,
          ]
        }
        const contentBudget = getContentBudgetForMessages(trimmed)

        let reply
        let sources = { ai: true, vault: false, notes: false }

        const pageParts = []
        if (hasVault) {
          for (const item of relevantVault) {
            const pc = pageChunksMap[item.id]
            if (!pc?.length) continue
            for (const batch of splitPageBatches(item, pc, contentBudget)) {
              pageParts.push({ item, chunks: batch })
            }
          }
        }

        const vaultResources =
          asking && domain !== "notes"
            ? retrieveVaultResources(query, vaultItems)
            : []
        const vaultSection = buildVaultResourcesSection(vaultResources)
        const vaultSectionInjected =
          Boolean(vaultSection) && pageParts.length === 0

        if (vaultSectionInjected) {
          trimmed = [
            { role: "system", content: vaultSection },
            ...trimmed,
          ]
        }

        const knowledge =
          hasNotes || hasVault
            ? {
                notes: hasNotes ? relevantNotes : null,
                vaultItems:
                  hasVault && !vaultSectionInjected ? relevantVault : null,
                matchedChunks: Object.keys(matchedChunksMap).length > 0 ? matchedChunksMap : undefined,
                pageChunks: Object.keys(pageChunksMap).length > 0 ? pageChunksMap : undefined,
              }
            : undefined

        if (pageParts.length > 1) {
          const parts = []
          for (let i = 0; i < pageParts.length; i++) {
            const part = pageParts[i]
            const partKnowledge = {
              notes: hasNotes ? relevantNotes : null,
              vaultItems: [part.item],
              pageChunks: { [part.item.id]: part.chunks },
              partInfo: { part: i + 1, total: pageParts.length },
            }
            const result = await sendChatMessage(trimmed, partKnowledge)
            parts.push(result.content)
            sources.vault ||= result.sources.vault
            sources.notes ||= result.sources.notes
          }
          reply = parts
            .map((p, i) => `**Part ${i + 1}**\n\n${p}`)
            .join("\n\n")
        } else {
          const result = await sendChatMessage(trimmed, knowledge)
          reply = result.content
          sources = result.sources
          if (vaultSectionInjected) sources.vault = true
        }

        const finalContent =
          asking && !sources.vault && !sources.notes
            ? `${NO_KNOWLEDGE_PREFIX}\n\n${reply}`
            : reply

        addMessage(finalContent, "assistant", { sources })
        await summarizeIfNeeded()
      } catch (err) {
        const msg = err?.message || ""
        const isConfigError =
          msg.includes("API key") ||
          msg.startsWith("API 401") ||
          msg.startsWith("API 403")

        if (isConfigError) {
          addMessage(`⚠️ ${msg}`, "assistant")
        } else if (msg.startsWith("OFFLINE:")) {
          addMessage(msg.replace("OFFLINE: ", ""), "assistant")
        } else if (msg.startsWith("NETWORK_ERROR:")) {
          addMessage(msg.replace("NETWORK_ERROR: ", ""), "assistant")
        } else if (msg.startsWith("AI_TIMEOUT:")) {
          addMessage(msg.replace("AI_TIMEOUT: ", ""), "assistant")
        } else if (msg.startsWith("CONTENT_TOO_LARGE:")) {
          addMessage(msg.replace("CONTENT_TOO_LARGE: ", ""), "assistant")
        } else if (msg.startsWith("RATE_LIMITED:")) {
          addMessage(msg.replace("RATE_LIMITED: ", ""), "assistant")
        } else {
          addMessage(`I ran into an issue: ${msg}`, "assistant")
        }
      } finally {
        setIsTyping(false)
      }
    },
    [messages, notes, vaultItems, addMessage, email, bumpSessionActivity, summarizeIfNeeded, summary]
  )

  return {
    sessions,
    messages,
    summary,
    activeSessionId,
    addMessage,
    clearMessages,
    sendMessage,
    isTyping,
    createSession,
    renameSession,
    deleteSession,
    setActiveSession,
    saveMessages,
  }
}
