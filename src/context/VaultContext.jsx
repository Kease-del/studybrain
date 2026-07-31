import { createContext, useState, useCallback, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"

const OLD_KEY = "studybrain_vault"

export const VaultContext = createContext(null)

export function VaultProvider({ children }) {
  const { user } = useAuth()
  const userKey = user ? `${OLD_KEY}_${user.email}` : null
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!userKey) {
      setItems([])
      return
    }

    const oldData = localStorage.getItem(OLD_KEY)
    const userData = localStorage.getItem(userKey)

    if (oldData && !userData) {
      const migrated = JSON.parse(oldData).map((item) => ({
        tags: [],
        pinned: false,
        ...item,
      }))
      localStorage.setItem(userKey, JSON.stringify(migrated))
      localStorage.removeItem(OLD_KEY)
    }

    const stored = localStorage.getItem(userKey)
    const parsed = stored ? JSON.parse(stored) : []
    const migrated = parsed.map((item) => ({
      tags: [],
      pinned: false,
      ...item,
    }))
    setItems(migrated)
  }, [userKey])

  const sync = useCallback(
    (updated) => {
      if (userKey) {
        localStorage.setItem(userKey, JSON.stringify(updated))
      }
      setItems(updated)
    },
    [userKey]
  )

  const addItem = useCallback(
    (data) => {
      const newItem = {
        id: crypto.randomUUID(),
        tags: [],
        pinned: false,
        ...data,
        createdAt: new Date().toISOString(),
      }
      sync([newItem, ...items])
    },
    [items, sync]
  )

  const deleteItem = useCallback(
    (id) => {
      sync(items.filter((item) => item.id !== id))
    },
    [items, sync]
  )

  const editItem = useCallback(
    (id, updates) => {
      sync(
        items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        )
      )
    },
    [items, sync]
  )

  const togglePin = useCallback(
    (id) => {
      sync(
        items.map((item) =>
          item.id === id ? { ...item, pinned: !item.pinned } : item
        )
      )
    },
    [items, sync]
  )

  return (
    <VaultContext.Provider
      value={{ items, addItem, deleteItem, editItem, togglePin }}
    >
      {children}
    </VaultContext.Provider>
  )
}
