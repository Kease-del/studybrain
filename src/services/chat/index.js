import { localChatProvider } from "./local"
import { supabaseChatProvider } from "./supabase"

const CHAT_PROVIDER = import.meta.env.VITE_CHAT_PROVIDER || "local"

export const isSupabaseChat = CHAT_PROVIDER === "supabase"

export const activeChatProvider =
  isSupabaseChat ? supabaseChatProvider : localChatProvider

export function getChatProvider() {
  return activeChatProvider
}
