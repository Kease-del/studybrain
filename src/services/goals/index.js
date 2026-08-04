import { localGoalsProvider } from "./local"
import { supabaseGoalsProvider } from "./supabase"

const GOALS_PROVIDER = import.meta.env.VITE_GOALS_PROVIDER || "local"

export const activeGoalsProvider =
  GOALS_PROVIDER === "supabase" ? supabaseGoalsProvider : localGoalsProvider

export function getGoalsProvider() {
  return activeGoalsProvider
}
