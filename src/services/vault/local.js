const OLD_KEY = "studybrain_vault"

const getUserKey = (user) => `${OLD_KEY}_${user.email}`

const normalize = (item) => ({ tags: [], pinned: false, ...item })

const readAll = (user) => {
  const userKey = getUserKey(user)

  const oldData = localStorage.getItem(OLD_KEY)
  const userData = localStorage.getItem(userKey)

  if (oldData && !userData) {
    localStorage.setItem(
      userKey,
      JSON.stringify(JSON.parse(oldData).map(normalize))
    )
    localStorage.removeItem(OLD_KEY)
  }

  const stored = localStorage.getItem(userKey)
  return stored ? JSON.parse(stored).map(normalize) : []
}

export const localVaultProvider = {
  fetchItems(user) {
    return readAll(user)
  },

  addItem(user, item) {
    localStorage.setItem(
      getUserKey(user),
      JSON.stringify([item, ...readAll(user)])
    )
  },

  updateItem(user, item) {
    localStorage.setItem(
      getUserKey(user),
      JSON.stringify(readAll(user).map((i) => (i.id === item.id ? item : i)))
    )
  },

  deleteItem(user, itemId) {
    localStorage.setItem(
      getUserKey(user),
      JSON.stringify(readAll(user).filter((i) => i.id !== itemId))
    )
  },
}
