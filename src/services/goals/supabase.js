import { getSupabase } from "@/lib/supabase"

const TABLE = "goals"

const requireUserId = (user) => {
  if (!user?.id) {
    throw new Error(
      "Supabase goals require a Supabase auth session (set VITE_AUTH_PROVIDER=supabase)."
    )
  }
  return user.id
}

const mapRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description ?? "",
  targetDate: row.target_date ?? "",
  completed: row.completed ?? false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const supabaseGoalsProvider = {
  async fetchGoals(user) {
    const userId = requireUserId(user)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, title, description, target_date, completed, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(mapRow)
  },

  async addGoal(user, goal) {
    const userId = requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase.from(TABLE).insert({
      id: goal.id,
      user_id: userId,
      title: goal.title,
      description: goal.description ?? "",
      target_date: goal.targetDate || null,
      completed: goal.completed ?? false,
      created_at: goal.createdAt,
      updated_at: goal.createdAt,
    })
    if (error) throw new Error(error.message)
  },

  async updateGoal(user, goal) {
    requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase
      .from(TABLE)
      .update({
        title: goal.title,
        description: goal.description ?? "",
        target_date: goal.targetDate || null,
        completed: goal.completed ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", goal.id)
    if (error) throw new Error(error.message)
  },

  async deleteGoal(user, goalId) {
    requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase.from(TABLE).delete().eq("id", goalId)
    if (error) throw new Error(error.message)
  },

  async clearGoals(user) {
    const userId = requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase.from(TABLE).delete().eq("user_id", userId)
    if (error) throw new Error(error.message)
  },
}
