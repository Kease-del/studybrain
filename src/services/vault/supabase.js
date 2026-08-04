import { getSupabase } from "@/lib/supabase"

const TABLE = "vault_items"

const requireUserId = (user) => {
  if (!user?.id) {
    throw new Error(
      "Supabase vault requires a Supabase auth session (set VITE_AUTH_PROVIDER=supabase)."
    )
  }
  return user.id
}

const mapRow = (row) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  url: row.url ?? undefined,
  filename: row.filename ?? undefined,
  fileSize: row.file_size ?? undefined,
  content: row.content ?? undefined,
  chunks: row.chunks ?? [],
  tags: row.tags ?? [],
  pinned: row.pinned ?? false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const supabaseVaultProvider = {
  async fetchItems(user) {
    const userId = requireUserId(user)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        "id, type, title, url, filename, file_size, content, chunks, tags, pinned, created_at, updated_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(mapRow)
  },

  async addItem(user, item) {
    const userId = requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase.from(TABLE).insert({
      id: item.id,
      user_id: userId,
      type: item.type,
      title: item.title,
      url: item.url || null,
      filename: item.filename || null,
      file_size: item.fileSize ?? null,
      content: item.content ?? null,
      chunks: item.chunks ?? [],
      tags: item.tags ?? [],
      pinned: item.pinned ?? false,
      created_at: item.createdAt,
      updated_at: item.createdAt,
    })
    if (error) throw new Error(error.message)
  },

  async updateItem(user, item) {
    requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase
      .from(TABLE)
      .update({
        type: item.type,
        title: item.title,
        url: item.url || null,
        filename: item.filename || null,
        file_size: item.fileSize ?? null,
        content: item.content ?? null,
        chunks: item.chunks ?? [],
        tags: item.tags ?? [],
        pinned: item.pinned ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
    if (error) throw new Error(error.message)
  },

  async deleteItem(user, itemId) {
    requireUserId(user)
    const supabase = getSupabase()
    const { error } = await supabase.from(TABLE).delete().eq("id", itemId)
    if (error) throw new Error(error.message)
  },
}
