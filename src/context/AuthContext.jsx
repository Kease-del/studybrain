import { createContext, useContext, useEffect, useState } from "react"

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem("studybrain_user")

    if (storedUser) {
      const parsed = JSON.parse(storedUser)
      const users = JSON.parse(localStorage.getItem("studybrain_users")) || []
      const valid = users.some((u) => u.email === parsed.email)

      if (valid) {
        setUser(parsed)
      } else {
        localStorage.removeItem("studybrain_user")
      }
    }

    setLoading(false)
  }, [])

  const getUsers = () => {
    return JSON.parse(localStorage.getItem("studybrain_users")) || []
  }

  const saveUsers = (users) => {
    localStorage.setItem("studybrain_users", JSON.stringify(users))
  }

  const register = (name, email, password) => {
    const users = getUsers()

    const exists = users.find((u) => u.email === email)
    if (exists) {
      return { error: "User already exists" }
    }

    const newUser = { name, email, password }
    users.push(newUser)
    saveUsers(users)

    setUser(newUser)
    localStorage.setItem("studybrain_user", JSON.stringify(newUser))

    return { success: true }
  }

  const login = (email, password) => {
    const users = getUsers()

    const foundUser = users.find((u) => u.email === email)

    if (!foundUser) {
      return { error: "User does not exist" }
    }

    if (foundUser.password !== password) {
      return { error: "Invalid credentials" }
    }

    setUser(foundUser)
    localStorage.setItem("studybrain_user", JSON.stringify(foundUser))

    return { success: true }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("studybrain_user")
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
