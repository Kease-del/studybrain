import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import AppRoutes from "@/routes"
import SplashScreen from "@/components/SplashScreen"
import { applyTheme, getStoredTheme } from "@/services/theme"

export default function App() {
  const { user } = useAuth()
  const [splashDone, setSplashDone] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    applyTheme(getStoredTheme(user?.email))
  }, [user?.email])

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setSplashDone(true), 500)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {!splashDone && <SplashScreen fadeOut={fadeOut} />}
      <AppRoutes />
    </>
  )
}
