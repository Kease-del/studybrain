const STORAGE_KEY = "studybrain_goals"

const getUserKey = (user) => `${STORAGE_KEY}_${user.email}`

const readAll = (user) => {
  const stored = localStorage.getItem(getUserKey(user))
  return stored ? JSON.parse(stored) : []
}

export const localGoalsProvider = {
  fetchGoals(user) {
    return readAll(user)
  },

  addGoal(user, goal) {
    localStorage.setItem(
      getUserKey(user),
      JSON.stringify([goal, ...readAll(user)])
    )
  },

  updateGoal(user, goal) {
    localStorage.setItem(
      getUserKey(user),
      JSON.stringify(readAll(user).map((g) => (g.id === goal.id ? goal : g)))
    )
  },

  deleteGoal(user, goalId) {
    localStorage.setItem(
      getUserKey(user),
      JSON.stringify(readAll(user).filter((g) => g.id !== goalId))
    )
  },

  clearGoals(user) {
    localStorage.setItem(getUserKey(user), "[]")
  },
}
