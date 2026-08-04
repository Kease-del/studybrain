import { useState, useCallback, useEffect, useRef } from "react"
import { sendChatMessage, getContentBudgetForMessages } from "@/services/ai"
import { trackChatMessage, resetChatSession, migrateChatSessions } from "@/services/analytics"
import { retrieveRelevantKnowledge, extractPageRefs } from "@/services/retriever"
import { splitPageBatches } from "@/services/contextBuilder"
import { trimHistory } from "@/services/history"
import { isAskingAboutKnowledge, getKnowledgeDomain } from "@/services/queryIntent"
import { useAuth } from "./useAuth"
import { useNotes } from "./useNotes"
import { useVault } from "./useVault"
import { getChatProvider } from "@/services/chat"

const NO_KNOWLEDGE_PREFIX =
  "I couldn't find anything about that in your saved notes or resources."

const ACTIVE_SESSION_KEY = (email) => `studybrain_chat_active_session_${email}`

function migrateLegacyMessages(email, sessionId, provider) {
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
  provider.saveMessages(email, sessionId, messages)
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
  const [isTyping, setIsTyping] = useState(false)

  const activeSessionIdRef = useRef(null)
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  useEffect(() => {
    migrateChatSessions(email)
  }, [email])

  useEffect(() => {
    if (!email) {
      setSessions([])
      setActiveSessionId(null)
      setMessages([])
      return
    }
    let disposed = false
    function bootstrap() {
      let list = provider.getSessions(email)

      if (list.length === 0) {
        const session = provider.createSession(email, "New Chat")
        migrateLegacyMessages(email, session.id, provider)
        list = provider.getSessions(email)
      }

      if (disposed) return
      setSessions(list)

      let active = localStorage.getItem(ACTIVE_SESSION_KEY(email))
      if (!active || !list.some((s) => s.id === active)) {
        active = list[0]?.id
      }
      setActiveSessionId(active)
      localStorage.setItem(ACTIVE_SESSION_KEY(email), active)
      setMessages(provider.getMessages(email, active))
    }
    bootstrap()
    return () => {
      disposed = true
    }
  }, [email, provider])

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
        const sid = activeSessionIdRef.current
        if (email && sid) {
          provider.saveMessages(email, sid, updated)
        }
        return updated
      })
    },
    [email, provider]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    const sid = activeSessionIdRef.current
    if (email && sid) {
      provider.saveMessages(email, sid, [])
    }
    resetChatSession(email)
  }, [email, provider])

  const createSession = useCallback(
    (title = "New Chat") => {
      if (!email) return null
      const session = provider.createSession(email, title)
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(session.id)
      setMessages([])
      localStorage.setItem(ACTIVE_SESSION_KEY(email), session.id)
      return session
    },
    [email, provider]
  )

  const renameSession = useCallback(
    (id, title) => {
      if (!email) return
      provider.renameSession(email, id, title)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, title, updatedAt: new Date().toISOString() } : s
        )
      )
    },
    [email, provider]
  )

  const deleteSession = useCallback(
    (id) => {
      if (!email) return
      provider.deleteSession(email, id)
      const list = provider.getSessions(email)
      setSessions(list)
      if (activeSessionIdRef.current === id) {
        let next = list[0]?.id
        if (list.length === 0) {
          const session = provider.createSession(email, "New Chat")
          setSessions([session])
          next = session.id
        }
        setActiveSessionId(next)
        setMessages(next ? provider.getMessages(email, next) : [])
        localStorage.setItem(ACTIVE_SESSION_KEY(email), next)
      }
    },
    [email, provider]
  )

  const saveMessages = useCallback(
    (sessionId, msgs) => {
      if (email) {
        provider.saveMessages(email, sessionId, msgs)
      }
    },
    [email, provider]
  )

  const sendMessage = useCallback(
    async (content) => {
      if (!content.trim()) return

      trackChatMessage(email)

      const query = content.trim()
      addMessage(query, "user")
      setIsTyping(true)

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
        const trimmed = trimHistory(conversation)
        const contentBudget = getContentBudgetForMessages(trimmed)

        const knowledge =
          hasNotes || hasVault
            ? {
                notes: hasNotes ? relevantNotes : null,
                vaultItems: hasVault ? relevantVault : null,
                matchedChunks: Object.keys(matchedChunksMap).length > 0 ? matchedChunksMap : undefined,
                pageChunks: Object.keys(pageChunksMap).length > 0 ? pageChunksMap : undefined,
              }
            : undefined

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
        }

        const finalContent =
          asking && !sources.vault && !sources.notes
            ? `${NO_KNOWLEDGE_PREFIX}\n\n${reply}`
            : reply

        addMessage(finalContent, "assistant", { sources })
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
    [messages, notes, vaultItems, addMessage, email]
  )

  return {
    sessions,
    messages,
    activeSessionId,
    addMessage,
    clearMessages,
    sendMessage,
    isTyping,
    createSession,
    renameSession,
    deleteSession,
    saveMessages,
  }
}