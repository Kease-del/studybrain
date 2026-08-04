import { createContext, useState, useCallback, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { getGoalsProvider } from "@/services/goals"

export const GoalsContext = createContext(null)

export function GoalsProvider({ children }) {
  const { user } = useAuth()
  const provider = getGoalsProvider()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!user) return
    try {
      const stored = await provider.fetchGoals(user)
      setGoals(stored)
      setError(null)
    } catch (err) {
      console.error("Failed to reload goals:", err.message)
      setError(err.message)
    }
  }, [user, provider])

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const stored = user ? await provider.fetchGoals(user) : []
        if (!active) return
        setGoals(stored)
        setError(null)
      } catch (err) {
        if (!active) return
        console.error("Failed to load goals:", err.message)
        setGoals([])
        setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [user, provider])

  const addGoal = useCallback(
    async (title, description, targetDate) => {
      if (!user) return
      const newGoal = {
        id: crypto.randomUUID(),
        title,
        description: description ?? "",
        targetDate: targetDate ?? "",
        completed: false,
        createdAt: new Date().toISOString(),
      }
      setGoals((prev) => [newGoal, ...prev])
      try {
        await provider.addGoal(user, newGoal)
        setError(null)
      } catch (err) {
        setGoals((prev) => prev.filter((goal) => goal.id !== newGoal.id))
        await reload()
        setError(err.message)
      }
    },
    [user, provider, reload]
  )

  const deleteGoal = useCallback(
    async (id) => {
      if (!user) return
      setGoals((prev) => prev.filter((goal) => goal.id !== id))
      try {
        await provider.deleteGoal(user, id)
        setError(null)
      } catch (err) {
        await reload()
        setError(err.message)
      }
    },
    [user, provider, reload]
  )

  const toggleGoalCompletion = useCallback(
    async (id) => {
      if (!user) return
      const previous = goals.find((goal) => goal.id === id)
      if (!previous) return
      const updated = { ...previous, completed: !previous.completed }
      setGoals((prev) =>
        prev.map((goal) => (goal.id === id ? updated : goal))
      )
      try {
        await provider.updateGoal(user, updated)
        setError(null)
      } catch (err) {
        await reload()
        setError(err.message)
      }
    },
    [user, provider, goals, reload]
  )

  const clearGoals = useCallback(async () => {
    if (!user) return
    setGoals([])
    try {
      await provider.clearGoals(user)
      setError(null)
    } catch (err) {
      await reload()
      setError(err.message)
    }
  }, [user, provider, reload])

  return (
    <GoalsContext.Provider
      value={{
        goals,
        addGoal,
        deleteGoal,
        toggleGoalCompletion,
        clearGoals,
        loading,
        error,
      }}
    >
      {children}
    </GoalsContext.Provider>
  )
}
