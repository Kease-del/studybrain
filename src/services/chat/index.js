import { localChatProvider } from "./local"

const CHAT_PROVIDER = import.meta.env.VITE_CHAT_PROVIDER || "local"

export const activeChatProvider =
  CHAT_PROVIDER === "local" ? localChatProvider : localChatProvider

export function getChatProvider() {
  return activeChatProvider
}