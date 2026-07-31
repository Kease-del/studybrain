import { useContext } from "react"
import { VaultContext } from "@/context/VaultContext"

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) {
    throw new Error("useVault must be used within a VaultProvider")
  }
  return context
}
