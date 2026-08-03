import { createContext, useContext, useEffect, useState } from "react"
import { getSupabase } from "@/lib/supabase"

export const AuthContext = createContext()

const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER || "local"
const isSupabase = AUTH_PROVIDER === "supabase"

const mapSupabaseUser = (sbUser) => {
  if (!sbUser) return null
  const metadata = sbUser.user_metadata || {}
  return {
    id: sbUser.id,
    name:
      metadata.name ||
      metadata.full_name ||
      (sbUser.email ? sbUser.email.split("@")[0] : "User"),
    email: sbUser.email || "",
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSupabase) return

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

  useEffect(() => {
    if (!isSupabase) return

    let active = true
    let subscription = null

    const init = async () => {
      const supabase = getSupabase()
      const { data } = await supabase.auth.getSession()
      subscription = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return
        setUser(mapSupabaseUser(session?.user))
      })
      if (!active) return
      setUser(mapSupabaseUser(data.session?.user))
      setLoading(false)
    }

    init().catch((err) => {
      console.error("Supabase auth is not configured:", err.message)
      if (active) setLoading(false)
    })

    return () => {
      active = false
      subscription?.data?.subscription?.unsubscribe()
    }
  }, [])

  const getUsers = () => {
    return JSON.parse(localStorage.getItem("studybrain_users")) || []
  }

  const saveUsers = (users) => {
    localStorage.setItem("studybrain_users", JSON.stringify(users))
  }

  const register = async (name, email, password) => {
    if (!isSupabase) {
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

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })

      if (error) {
        return { error: error.message }
      }

      if (data?.user && data.user.identities?.length === 0) {
        return { error: "User already exists" }
      }

      if (data?.session) {
        setUser(mapSupabaseUser(data.user))
      }

      return { success: true }
    } catch (err) {
      return { error: err.message || "Registration failed" }
    }
  }

  const login = async (email, password) => {
    if (!isSupabase) {
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

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      setUser(mapSupabaseUser(data.user))
      return { success: true }
    } catch (err) {
      return { error: err.message || "Login failed" }
    }
  }

  const logout = async () => {
    if (isSupabase) {
      try {
        const supabase = getSupabase()
        await supabase.auth.signOut()
      } catch (err) {
        console.error("Logout failed:", err.message)
      }
      setUser(null)
      return
    }

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
