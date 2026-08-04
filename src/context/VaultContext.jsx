import { createContext, useState, useCallback, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { getVaultProvider } from "@/services/vault"

export const VaultContext = createContext(null)

export function VaultProvider({ children }) {
  const { user } = useAuth()
  const provider = getVaultProvider()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!user) return
    try {
      const stored = await provider.fetchItems(user)
      setItems(stored)
      setError(null)
    } catch (err) {
      console.error("Failed to reload vault:", err.message)
      setError(err.message)
    }
  }, [user, provider])

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const stored = user ? await provider.fetchItems(user) : []
        if (!active) return
        setItems(stored)
        setError(null)
      } catch (err) {
        if (!active) return
        console.error("Failed to load vault:", err.message)
        setItems([])
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

  const addItem = useCallback(
    async (data) => {
      if (!user) return
      const newItem = {
        id: crypto.randomUUID(),
        tags: [],
        pinned: false,
        ...data,
        createdAt: new Date().toISOString(),
      }
      setItems((prev) => [newItem, ...prev])
      try {
        await provider.addItem(user, newItem)
        setError(null)
      } catch (err) {
        setItems((prev) => prev.filter((item) => item.id !== newItem.id))
        await reload()
        setError(err.message)
      }
    },
    [user, provider, reload]
  )

  const deleteItem = useCallback(
    async (id) => {
      if (!user) return
      setItems((prev) => prev.filter((item) => item.id !== id))
      try {
        await provider.deleteItem(user, id)
        setError(null)
      } catch (err) {
        await reload()
        setError(err.message)
      }
    },
    [user, provider, reload]
  )

  const editItem = useCallback(
    async (id, updates) => {
      if (!user) return
      const previous = items.find((item) => item.id === id)
      if (!previous) return
      const updated = { ...previous, ...updates }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      )
      try {
        await provider.updateItem(user, updated)
        setError(null)
      } catch (err) {
        await reload()
        setError(err.message)
      }
    },
    [user, provider, items, reload]
  )

  const togglePin = useCallback(
    async (id) => {
      if (!user) return
      const previous = items.find((item) => item.id === id)
      if (!previous) return
      const updated = { ...previous, pinned: !previous.pinned }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      )
      try {
        await provider.updateItem(user, updated)
        setError(null)
      } catch (err) {
        await reload()
        setError(err.message)
      }
    },
    [user, provider, items, reload]
  )

  return (
    <VaultContext.Provider
      value={{ items, addItem, deleteItem, editItem, togglePin, loading, error }}
    >
      {children}
    </VaultContext.Provider>
  )
}
