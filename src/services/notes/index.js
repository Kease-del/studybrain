import { localNotesProvider } from "./local"
import { supabaseNotesProvider } from "./supabase"

const NOTES_PROVIDER = import.meta.env.VITE_NOTES_PROVIDER || "local"

export const activeNotesProvider =
  NOTES_PROVIDER === "supabase" ? supabaseNotesProvider : localNotesProvider

export function getNotesProvider() {
  return activeNotesProvider
}
