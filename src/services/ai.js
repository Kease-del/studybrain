import { buildKnowledgeContext } from "./contextBuilder.js"

const AI_PROVIDER = import.meta.env?.VITE_AI_PROVIDER || "openai"
const AI_MODEL = import.meta.env?.VITE_AI_MODEL || ""
const AI_API_KEY = import.meta.env?.VITE_AI_API_KEY || ""
const AI_BASE_URL = import.meta.env?.VITE_AI_BASE_URL || ""

const EMBEDDING_PROVIDER =
  import.meta.env?.VITE_EMBEDDING_PROVIDER || AI_PROVIDER
const EMBEDDING_MODEL = import.meta.env?.VITE_EMBEDDING_MODEL || ""
const EMBEDDING_API_KEY = import.meta.env?.VITE_EMBEDDING_API_KEY || AI_API_KEY
const EMBEDDING_BASE_URL = import.meta.env?.VITE_EMBEDDING_BASE_URL || ""

const TIMEOUT_MS = 30000
const MAX_RETRIES = 2

const MODEL_LIMITS = {
  "gpt-4o-mini": 128000,
  "gpt-4o": 128000,
  "gemini-2.0-flash": 1048576,
  "llama3-70b-8192": 8192,
  "llama3-8b-8192": 8192,
  "mixtral-8x7b-32768": 32768,
}
const DEFAULT_MODEL_LIMIT = 8192
const CHARS_PER_TOKEN = 4
const RESPONSE_RESERVE_TOKENS = 500
const RESERVE_CHARS = RESPONSE_RESERVE_TOKENS * CHARS_PER_TOKEN

const PROVIDERS = {
  openai: {
    name: "OpenAI",
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1",
    getEndpoint: () => "/chat/completions",
    getHeaders: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (messages, model) => ({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content ?? "",
  },

  gemini: {
    name: "Google Gemini",
    defaultModel: "gemini-2.0-flash",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    getEndpoint: (model) => `/models/${model}:generateContent`,
    getHeaders: () => ({}),
    buildBody: (messages) => ({
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    }),
    parseResponse: (data) =>
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    getUrl: (baseUrl, endpoint, key) => `${baseUrl}${endpoint}?key=${key}`,
  },

  groq: {
    name: "Groq",
    defaultModel: "llama3-70b-8192",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    getEndpoint: () => "/chat/completions",
    getHeaders: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (messages, model) => ({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content ?? "",
  },
}

const EMBEDDING_DEFAULTS = {
  openai: "text-embedding-3-small",
  gemini: "gemini-embedding-2",
  groq: "text-embedding-3-small",
}

const EMBEDDING_PROVIDERS = {
  openai: {
    defaultBaseUrl: "https://api.openai.com/v1",
    getEndpoint: () => "/embeddings",
    getHeaders: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (text, model) => ({ model, input: text }),
    parseResponse: (data) => data.data?.[0]?.embedding ?? [],
  },
  gemini: {
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    getEndpoint: (model) => `/models/${model}:embedContent`,
    getHeaders: () => ({}),
    buildBody: (text) => ({ content: { parts: [{ text }] } }),
    parseResponse: (data) => data.embedding?.values ?? [],
    getUrl: (baseUrl, endpoint, key) => `${baseUrl}${endpoint}?key=${key}`,
  },
  groq: {
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    getEndpoint: () => "/embeddings",
    getHeaders: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (text, model) => ({ model, input: text }),
    parseResponse: (data) => data.data?.[0]?.embedding ?? [],
  },
}

const SUMMARIZATION_INSTRUCTION =
  "You are summarizing a conversation for future context. Write a concise factual summary. Include important topics, decisions, solved problems, user preferences, and ongoing work. Do not include greetings or filler. Keep the summary under 300 words."

function getContextLimit(provider, model) {
  const key = model || provider.defaultModel
  return MODEL_LIMITS[key] ?? DEFAULT_MODEL_LIMIT
}

function estimateChars(tokenLimit) {
  return tokenLimit * CHARS_PER_TOKEN
}

export function getContentBudgetForMessages(messages) {
  const provider = PROVIDERS[AI_PROVIDER] || PROVIDERS.openai
  const model = AI_MODEL || provider.defaultModel
  const contextLimit = getContextLimit(provider, model)
  const totalChars = estimateChars(contextLimit)
  const historyChars = (messages ?? []).reduce(
    (sum, m) => sum + (m.content?.length ?? 0),
    0
  )
  return Math.max(0, totalChars - historyChars - RESERVE_CHARS)
}

function providerUrl(provider, endpoint) {
  const baseUrl = AI_BASE_URL || provider.defaultBaseUrl
  return provider.getUrl
    ? provider.getUrl(baseUrl, endpoint, AI_API_KEY)
    : `${baseUrl}${endpoint}`
}

function providerHeaders(provider) {
  return {
    "Content-Type": "application/json",
    ...provider.getHeaders(AI_API_KEY),
  }
}

async function postWithRetry(url, headers, body, parseResponse, isEmptyReply) {
  let lastError

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!res.ok) {
        const errorText = await res.text().catch(() => "")
        if (res.status === 413) {
          throw new Error(
            "CONTENT_TOO_LARGE: The requested document or page is too large for a single response. Try asking about a specific section or page."
          )
        }
        if (res.status === 429) {
          throw new Error(
            "RATE_LIMITED: The AI provider is temporarily rate-limited. Please wait a moment and try again."
          )
        }
        throw new Error(
          `API ${res.status}${errorText ? `: ${errorText.slice(0, 200)}` : ""}`
        )
      }

      const data = await res.json()
      const reply = parseResponse(data)

      if (isEmptyReply(reply)) {
        throw new Error("AI returned an empty response.")
      }

      return reply
    } catch (err) {
      clearTimeout(timer)
      lastError = err

      if (err.name === "AbortError") {
        lastError = new Error(
          "AI_TIMEOUT: The AI is taking longer than expected. Please try again."
        )
      } else if (
        typeof navigator !== "undefined" &&
        navigator.onLine === false
      ) {
        lastError = new Error(
          "OFFLINE: No internet connection. Please check your connection and try again."
        )
      } else if (err instanceof TypeError) {
        lastError = new Error(
          "NETWORK_ERROR: Unable to reach the AI service right now. Please try again."
        )
      }

      const noRetry =
        lastError.message?.startsWith("AI_TIMEOUT") ||
        lastError.message?.startsWith("OFFLINE") ||
        lastError.message?.startsWith("NETWORK_ERROR") ||
        lastError.message?.startsWith("API 4") ||
        lastError.message?.startsWith("API 40")

      if (noRetry) break

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000))
      }
    }
  }

  throw lastError || new Error("AI request failed.")
}

async function requestChat(messages) {
  if (!AI_API_KEY) {
    throw new Error(
      "No API key configured. Set VITE_AI_API_KEY in your .env file."
    )
  }

  const provider = PROVIDERS[AI_PROVIDER]
  if (!provider) {
    throw new Error(
      `Unknown AI provider "${AI_PROVIDER}". Use: ${Object.keys(PROVIDERS).join(", ")}`
    )
  }

  const model = AI_MODEL || provider.defaultModel
  const endpoint = provider.getEndpoint(model)
  const body = provider.buildBody(messages, model)

  return postWithRetry(
    providerUrl(provider, endpoint),
    providerHeaders(provider),
    body,
    provider.parseResponse,
    (reply) => !reply
  )
}

export async function embedText(text) {
  if (!EMBEDDING_API_KEY) {
    throw new Error(
      "No API key configured. Set VITE_EMBEDDING_API_KEY (or VITE_AI_API_KEY) in your .env file."
    )
  }

  const provider = EMBEDDING_PROVIDERS[EMBEDDING_PROVIDER]
  if (!provider) {
    throw new Error(
      `No embedding support for AI provider "${EMBEDDING_PROVIDER}". Use: ${Object.keys(EMBEDDING_PROVIDERS).join(", ")}`
    )
  }

  const model = EMBEDDING_MODEL || EMBEDDING_DEFAULTS[EMBEDDING_PROVIDER]
  const baseUrl = EMBEDDING_BASE_URL || provider.defaultBaseUrl
  const endpoint = provider.getEndpoint(model)
  const url = provider.getUrl
    ? provider.getUrl(baseUrl, endpoint, EMBEDDING_API_KEY)
    : `${baseUrl}${endpoint}`

  const headers = {
    "Content-Type": "application/json",
    ...provider.getHeaders(EMBEDDING_API_KEY),
  }

  const body = provider.buildBody(text, model)

  const vector = await postWithRetry(
    url,
    headers,
    body,
    provider.parseResponse,
    (embedding) => !Array.isArray(embedding) || embedding.length === 0
  )

  return vector
}

export async function sendChatMessage(messages, knowledge) {
  const contentBudget = getContentBudgetForMessages(messages)

  const { prompt, sources } = buildKnowledgeContext(
    knowledge?.notes,
    knowledge?.vaultItems,
    knowledge?.matchedChunks,
    knowledge?.pageChunks,
    contentBudget,
    knowledge?.partInfo
  )

  const enrichedMessages = prompt
    ? [{ role: "system", content: prompt }, ...messages]
    : messages

  const content = await requestChat(enrichedMessages)

  return { content, sources }
}

export async function summarizeConversation(messages, existingSummary = "") {
  const conversationText = (messages ?? [])
    .map((m) => {
      const speaker = m.role === "assistant" ? "Assistant" : "User"
      return `${speaker}:\n${m.content}`
    })
    .join("\n\n")
  const existing = existingSummary
    ? `Existing summary:\n${existingSummary}\n\n`
    : ""

  const content = await requestChat([
    { role: "system", content: SUMMARIZATION_INSTRUCTION },
    {
      role: "user",
      content: `${existing}Summarize the following conversation:\n\n${conversationText}`,
    },
  ])
  return content.trim()
}
