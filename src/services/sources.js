export const SOURCE_CLASSES = {
  ai: {
    icon: "🧠",
    label: "AI Knowledge",
  },
  vault: {
    icon: "🗂",
    label: "From your Vault",
  },
  notes: {
    icon: "📝",
    label: "From your Notes",
  },
  vault_notes: {
    icon: "🗂 📝",
    label: "Vault & Notes",
  },
  ai_vault: {
    icon: "🧠 🗂",
    label: "AI + Vault",
  },
  ai_notes: {
    icon: "🧠 📝",
    label: "AI + Notes",
  },
  ai_vault_notes: {
    icon: "🧠 🗂 📝",
    label: "AI + Vault + Notes",
  },
}

export function getSourceClass({ ai, vault, notes } = {}) {
  const parts = []
  if (ai) parts.push("ai")
  if (vault) parts.push("vault")
  if (notes) parts.push("notes")
  return parts.join("_") || "ai"
}
