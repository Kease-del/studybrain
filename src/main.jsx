import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import "@/styles/globals.css"

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderDiagnosticScreen(title, body) {
  const root = document.getElementById("root")
  root.innerHTML = `
    <div style="min-height:100vh;background:#111;color:#f8fafc;font-family:ui-monospace,Menlo,Consolas,monospace;padding:24px;box-sizing:border-box">
      <h2 style="color:#f87171;margin:0 0 12px;font-size:18px">${escapeHtml(title)}</h2>
      <pre style="white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.5;margin:0;color:#e2e8f0">${escapeHtml(body)}</pre>
    </div>`
}

function handleGlobalError(event) {
  console.error("[boot-diagnostic] window error:", event)
  renderDiagnosticScreen(
    "StudyBrain boot failed (global error)",
    [
      `message: ${event?.message || "unknown"}`,
      `source: ${event?.filename || event?.source || ""}`,
      `line: ${event?.lineno} col: ${event?.colno}`,
      "",
      event?.error?.stack || (event?.error ? String(event.error) : ""),
    ].join("\n")
  )
}

function handleUnhandledRejection(event) {
  console.error("[boot-diagnostic] unhandled rejection:", event?.reason)
  const reason = event?.reason
  renderDiagnosticScreen(
    "StudyBrain boot failed (unhandled rejection)",
    [
      `reason: ${reason instanceof Error ? reason.message : String(reason ?? "unknown")}`,
      "",
      reason?.stack || "",
    ].join("\n")
  )
}

window.addEventListener("error", handleGlobalError)
window.addEventListener("unhandledrejection", handleUnhandledRejection)

import("@/App")
  .then(({ default: App }) => {
    console.info("[boot-diagnostic] App loaded successfully")
    createRoot(document.getElementById("root")).render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    )
  })
  .catch((err) => {
    console.error("[boot-diagnostic] dynamic import of App failed:", err)
    renderDiagnosticScreen(
      "StudyBrain failed to load App",
      [err instanceof Error ? err.message : String(err), "", err?.stack || ""].join("\n")
    )
  })
