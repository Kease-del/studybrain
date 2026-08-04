import { localVaultProvider } from "./local"
import { supabaseVaultProvider } from "./supabase"

const VAULT_PROVIDER = import.meta.env.VITE_VAULT_PROVIDER || "local"

export const activeVaultProvider =
  VAULT_PROVIDER === "supabase" ? supabaseVaultProvider : localVaultProvider

export function getVaultProvider() {
  return activeVaultProvider
}
