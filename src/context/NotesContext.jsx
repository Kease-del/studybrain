import { createContext, useState, useCallback, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"

const OLD_KEY = "studybrain_notes"

export const NotesContext = createContext(null)

export function NotesProvider({ children }) {
  const { user } = useAuth()
  const userKey = user ? `${OLD_KEY}_${user.email}` : null
  const [notes, setNotes] = useState([])

  useEffect(() => {
    if (!userKey) {
      setNotes([])
      return
    }

    const oldData = localStorage.getItem(OLD_KEY)
    const userData = localStorage.getItem(userKey)

    if (oldData && !userData) {
      localStorage.setItem(userKey, oldData)
      localStorage.removeItem(OLD_KEY)
    }

    const stored = localStorage.getItem(userKey)
    setNotes(stored ? JSON.parse(stored) : [])
  }, [userKey])

  const sync = useCallback(
    (updated) => {
      setNotes(updated)
      if (userKey) {
        localStorage.setItem(userKey, JSON.stringify(updated))
      }
    },
    [userKey]
  )

  const addNote = useCallback(
    (text) => {
      const newNote = {
        id: crypto.randomUUID(),
        text,
        createdAt: new Date().toISOString(),
      }
      sync([newNote, ...notes])
    },
    [notes, sync]
  )

  const deleteNote = useCallback(
    (id) => {
      sync(notes.filter((note) => note.id !== id))
    },
    [notes, sync]
  )

  const editNote = useCallback(
    (id, newText) => {
      sync(
        notes.map((note) =>
          note.id === id ? { ...note, text: newText } : note
        )
      )
    },
    [notes, sync]
  )

  return (
    <NotesContext.Provider
      value={{ notes, addNote, deleteNote, editNote }}
    >
      {children}
    </NotesContext.Provider>
  )
}
