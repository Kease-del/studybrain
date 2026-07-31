import React from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import "@/styles/globals.css"

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <h1 style={{ color: "white", background: "#111", padding: 40 }}>
        StudyBrain Boot Test
      </h1>
    </AuthProvider>
  </BrowserRouter>
)
