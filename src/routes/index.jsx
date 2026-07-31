import { Routes, Route } from "react-router-dom"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout } from "@/layouts/AppLayout"
import Landing from "@/pages/Landing"
import Login from "@/pages/Login"
import Register from "@/pages/Register"
import Dashboard from "@/pages/Dashboard"
import Notes from "@/pages/Notes"
import Vault from "@/pages/Vault"
import Goals from "@/pages/Goals"
import Chat from "@/pages/Chat"
import Settings from "@/pages/Settings"
import NotFound from "@/pages/NotFound"

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
