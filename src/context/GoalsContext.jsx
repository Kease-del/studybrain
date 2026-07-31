import { createContext, useState, useCallback, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"

const STORAGE_KEY = "studybrain_goals"

export const GoalsContext = createContext(null)

export function GoalsProvider({ children }) {
  const { user } = useAuth()
  const userKey = user ? `${STORAGE_KEY}_${user.email}` : null
  const [goals, setGoals] = useState([])

  useEffect(() => {
    if (!userKey) {
      setGoals([])
      return
    }

    const stored = localStorage.getItem(userKey)
    setGoals(stored ? JSON.parse(stored) : [])
  }, [userKey])

  const sync = useCallback(
    (updated) => {
      setGoals(updated)
      if (userKey) {
        localStorage.setItem(userKey, JSON.stringify(updated))
      }
    },
    [userKey]
  )

  const addGoal = useCallback(
    (title, description, targetDate) => {
      const newGoal = {
        id: crypto.randomUUID(),
        title,
        description: description ?? "",
        targetDate: targetDate ?? "",
        completed: false,
        createdAt: new Date().toISOString(),
      }
      sync([newGoal, ...goals])
    },
    [goals, sync]
  )

  const deleteGoal = useCallback(
    (id) => {
      sync(goals.filter((goal) => goal.id !== id))
    },
    [goals, sync]
  )

  const toggleGoalCompletion = useCallback(
    (id) => {
      sync(
        goals.map((goal) =>
          goal.id === id ? { ...goal, completed: !goal.completed } : goal
        )
      )
    },
    [goals, sync]
  )

  const clearGoals = useCallback(() => {
    sync([])
  }, [sync])

  return (
    <GoalsContext.Provider
      value={{ goals, addGoal, deleteGoal, toggleGoalCompletion, clearGoals }}
    >
      {children}
    </GoalsContext.Provider>
  )
}
