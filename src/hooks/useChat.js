import { useState, useCallback, useEffect } from "react"
import { sendChatMessage, getContentBudgetForMessages } from "@/services/ai"
import { trackChatMessage, resetChatSession, migrateChatSessions } from "@/services/analytics"
import { retrieveRelevantKnowledge, extractPageRefs } from "@/services/retriever"
import { splitPageBatches } from "@/services/contextBuilder"
import { trimHistory } from "@/services/history"
import { isAskingAboutKnowledge, getKnowledgeDomain } from "@/services/queryIntent"
import { useAuth } from "./useAuth"
import { useNotes } from "./useNotes"
import { useVault } from "./useVault"

const OLD_CHAT_KEY = "studybrain_chat"

const NO_KNOWLEDGE_PREFIX =
  "I couldn't find anything about that in your saved notes or resources."

export function useChat() {
  const { notes } = useNotes()
  const { items: vaultItems } = useVault()
  const { user } = useAuth()
  const chatKey = user ? `${OLD_CHAT_KEY}_${user.email}` : null
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    migrateChatSessions(user?.email)
  }, [user?.email])

  useEffect(() => {
    if (!chatKey) {
      setMessages([])
      return
    }
    const oldData = localStorage.getItem(OLD_CHAT_KEY)
    const userData = localStorage.getItem(chatKey)
    if (oldData && !userData) {
      localStorage.setItem(chatKey, oldData)
      localStorage.removeItem(OLD_CHAT_KEY)
    }
    const stored = localStorage.getItem(chatKey)
    setMessages(stored ? JSON.parse(stored) : [])
  }, [chatKey])

  const sync = useCallback((msgs) => {
    setMessages(msgs)
    if (chatKey) {
      localStorage.setItem(chatKey, JSON.stringify(msgs))
    }
  }, [chatKey])

  const addMessage = useCallback((content, role, metadata) => {
    const msg = {
      id: crypto.randomUUID(),
      role,
      content,
      ...(metadata ? { metadata } : {}),
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => {
      const updated = [...prev, msg]
      if (chatKey) {
        localStorage.setItem(chatKey, JSON.stringify(updated))
      }
      return updated
    })
  }, [chatKey])

  const clearMessages = useCallback(() => {
    sync([])
    resetChatSession(user?.email)
  }, [sync, user?.email])

  const sendMessage = useCallback(
    async (content) => {
      if (!content.trim()) return

      trackChatMessage(user?.email)

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
    [messages, notes, vaultItems, addMessage, user?.email]
  )

  return { messages, addMessage, clearMessages, sendMessage, isTyping }
}
