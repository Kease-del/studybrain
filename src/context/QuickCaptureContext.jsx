/* eslint-disable react-refresh/only-export-components */

import { createContext, useState, useCallback } from "react"

export const QuickCaptureContext = createContext(null)

export function QuickCaptureProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)

  const openCapture = useCallback(() => setIsOpen(true), [])
  const closeCapture = useCallback(() => setIsOpen(false), [])

  return (
    <QuickCaptureContext.Provider value={{ isOpen, openCapture, closeCapture }}>
      {children}
    </QuickCaptureContext.Provider>
  )
}
