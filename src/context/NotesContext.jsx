import { createContext, useState, useCallback, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { getNotesProvider } from "@/services/notes"
import {
  ensureNoteEmbedding,
  createEmbeddingDefaults,
} from "@/services/notesEmbedding"

export const NotesContext = createContext(null)

const postProcessNote = (note) => ({
  ...createEmbeddingDefaults(),
  ...note,
})

function embedNoteInBackground(user, provider, setNotes, note) {
  ensureNoteEmbedding(note)
    .then((embedded) => {
      if (embedded === note) return
      setNotes((prev) =>
        prev.map((n) => (n.id === embedded.id ? embedded : n))
      )
      return provider.updateNote(user, embedded)
    })
    .catch((err) => console.error("Note embedding unavailable:", err.message))
}

export function NotesProvider({ children }) {
  const { user } = useAuth()
  const provider = getNotesProvider()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!user) return
    try {
      const stored = await provider.fetchNotes(user)
      setNotes(stored.map(postProcessNote))
      setError(null)
    } catch (err) {
      console.error("Failed to reload notes:", err.message)
      setError(err.message)
    }
  }, [user, provider])

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const stored = user ? await provider.fetchNotes(user) : []
        if (!active) return
        setNotes(stored.map(postProcessNote))
        setError(null)
      } catch (err) {
        if (!active) return
        console.error("Failed to load notes:", err.message)
        setNotes([])
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

  const addNote = useCallback(
    async (text) => {
      if (!user) return
      const newNote = postProcessNote({
        id: crypto.randomUUID(),
        text,
        createdAt: new Date().toISOString(),
      })
      setNotes((prev) => [newNote, ...prev])
      try {
        await provider.addNote(user, newNote)
        setError(null)
        embedNoteInBackground(user, provider, setNotes, newNote)
      } catch (err) {
        setNotes((prev) => prev.filter((note) => note.id !== newNote.id))
        await reload()
        setError(err.message)
      }
    },
    [user, provider, reload]
  )

  const deleteNote = useCallback(
    async (id) => {
      if (!user) return
      setNotes((prev) => prev.filter((note) => note.id !== id))
      try {
        await provider.deleteNote(user, id)
        setError(null)
      } catch (err) {
        await reload()
        setError(err.message)
      }
    },
    [user, provider, reload]
  )

  const editNote = useCallback(
    async (id, newText) => {
      if (!user) return
      const previous = notes.find((note) => note.id === id)
      if (!previous) return
      const updated = { ...previous, text: newText }
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id ? updated : note
        )
      )
      try {
        await provider.updateNote(user, updated)
        setError(null)
        embedNoteInBackground(user, provider, setNotes, updated)
      } catch (err) {
        await reload()
        setError(err.message)
      }
    },
    [user, provider, notes, reload]
  )

  return (
    <NotesContext.Provider
      value={{ notes, addNote, deleteNote, editNote, loading, error }}
    >
      {children}
    </NotesContext.Provider>
  )
}
