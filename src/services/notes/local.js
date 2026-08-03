const OLD_KEY = "studybrain_notes"

const getUserKey = (user) => `${OLD_KEY}_${user.email}`

const readAll = (user) => {
  const userKey = getUserKey(user)

  const oldData = localStorage.getItem(OLD_KEY)
  const userData = localStorage.getItem(userKey)

  if (oldData && !userData) {
    localStorage.setItem(userKey, oldData)
    localStorage.removeItem(OLD_KEY)
  }

  const stored = localStorage.getItem(userKey)
  return stored ? JSON.parse(stored) : []
}

export const localNotesProvider = {
  fetchNotes(user) {
    return readAll(user)
  },

  addNote(user, note) {
    const userKey = getUserKey(user)
    const notes = readAll(user)
    localStorage.setItem(userKey, JSON.stringify([note, ...notes]))
  },

  updateNote(user, note) {
    const userKey = getUserKey(user)
    const notes = readAll(user)
    localStorage.setItem(
      userKey,
      JSON.stringify(notes.map((n) => (n.id === note.id ? note : n)))
    )
  },

  deleteNote(user, noteId) {
    const userKey = getUserKey(user)
    const notes = readAll(user)
    localStorage.setItem(
      userKey,
      JSON.stringify(notes.filter((n) => n.id !== noteId))
    )
  },
}
