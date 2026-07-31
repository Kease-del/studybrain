import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import { QuickCaptureProvider } from "@/context/QuickCaptureContext"
import { NotesProvider } from "@/context/NotesContext"
import { VaultProvider } from "@/context/VaultContext"
import { GoalsProvider } from "@/context/GoalsContext"
import { SearchProvider } from "@/context/SearchContext"
import App from "@/App"
import "@/styles/globals.css"
import { Toaster } from "react-hot-toast"
import ErrorBoundary from "@/components/ErrorBoundary"

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <NotesProvider>
            <VaultProvider>
              <GoalsProvider>
                <SearchProvider>
                  <QuickCaptureProvider>
                    <App />
                  </QuickCaptureProvider>
                </SearchProvider>
              </GoalsProvider>
            </VaultProvider>
          </NotesProvider>
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  </ErrorBoundary>
)
