import { useContext } from "react"
import { QuickCaptureContext } from "@/context/QuickCaptureContext"

export function useQuickCapture() {
  const context = useContext(QuickCaptureContext)
  if (!context) {
    throw new Error(
      "useQuickCapture must be used within a QuickCaptureProvider"
    )
  }
  return context
}
