import { useState, useEffect } from "react"
import { useVault } from "@/hooks/useVault"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import AddResourceModal from "@/components/AddResourceModal"
import ConfirmDialog from "@/components/ConfirmDialog"
import EmptyState from "@/components/EmptyState"
import { SkeletonVaultCard } from "@/components/Skeleton"
import {
  Database,
  FileText,
  Link,
  File,
  Plus,
  Search,
  Trash2,
  Pin,
  PinOff,
} from "lucide-react"
import toast from "react-hot-toast"
import mammoth from "mammoth"
import { formatRelativeTime } from "@/lib/utils"
import { getFile, deleteFile } from "@/services/fileStorage"

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "text", label: "Text" },
  { value: "link", label: "Link" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Documents" },
]

const TYPE_ICONS = {
  text: FileText,
  link: Link,
  pdf: File,
  docx: FileText,
}

const SECTION_LABELS = {
  text: "Text Notes",
  link: "Links",
  pdf: "PDFs",
  docx: "Documents",
}

const TYPE_ORDER = ["text", "link", "pdf", "docx"]

export default function Vault() {
  const { items, deleteItem, togglePin } = useVault()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setLoading(false))
    return () => cancelAnimationFrame(raf)
  }, [])

  const filtered = items.filter((item) => {
    const matchesType = typeFilter === "all" || item.type === typeFilter
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.content && item.content.toLowerCase().includes(q)) ||
      (item.url && item.url.toLowerCase().includes(q)) ||
      (item.filename && item.filename.toLowerCase().includes(q)) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(q))
    return matchesType && matchesSearch
  })

  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  const grouped =
    typeFilter === "all"
      ? TYPE_ORDER.reduce((acc, t) => {
          const group = sorted.filter((i) => i.type === t)
          if (group.length) acc[t] = group
          return acc
        }, {})
      : null

  async function openFile(item) {
    const mimeType =
      item.type === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    let fileData = item.fileData
    if (!fileData) {
      fileData = await getFile(item.id)
    }
    if (!fileData) {
      toast.error("File not found")
      return
    }

    const binary = atob(fileData.split(",")[1])
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    if (mimeType === "application/pdf") {
      const blob = new Blob([bytes], { type: mimeType })
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      return
    }

    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${item.filename || "Document"}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left}</style></head><body>${result.value}</body></html>`
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      return
    }

    const blob = new Blob([bytes], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = item.filename || "document"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete(id) {
    try {
      await deleteFile(id)
    } catch {
      toast.error("Failed to remove the file. Please try again.")
      return
    }
    try {
      deleteItem(id)
    } catch {
      toast.error("Deleted the file but failed to update the vault. Please refresh.")
      return
    }
    setDeleteTarget(null)
    toast.success("Resource deleted")
  }

  function renderCard(item, i) {
    const Icon = TYPE_ICONS[item.type] || File

    return (
      <Card
        key={item.id}
        className="group hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
        style={{ animationDelay: `${i * 30}ms` }}
      >
        <CardContent className="p-4 space-y-3">
      <div className="page-head-row flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {item.type}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => togglePin(item.id)}
                className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-accent"
                title={item.pinned ? "Unpin" : "Pin"}
              >
                {item.pinned ? (
                  <PinOff className="h-4 w-4 text-muted-foreground hover:text-primary" />
                ) : (
                  <Pin className="h-4 w-4 text-muted-foreground hover:text-primary" />
                )}
              </button>
              <button
                onClick={() => setDeleteTarget(item.id)}
                className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-accent"
                title="Delete resource"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          </div>

          {item.pinned && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Pin className="h-3 w-3" />
              <span>Pinned</span>
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {item.type === "text" && item.content && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {item.content}
            </p>
          )}

          {item.type === "link" && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline line-clamp-1 block"
            >
              {item.url}
            </a>
          )}

          {(item.type === "pdf" || item.type === "docx") && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground line-clamp-1">
                {item.filename}
              </p>
              {item.content && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {item.content}
                </p>
              )}
              {item.fileData !== undefined || item.type === "pdf" || item.type === "docx" ? (
                <button
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    onClick={() => openFile(item)}
                >
                  {item.type === "pdf" ? "View PDF" : "View document"}
                  {item.fileSize && (
                    <span className="text-muted-foreground font-normal">
                      ({(item.fileSize / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  File not available
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(item.createdAt)}
          </p>
        </CardContent>
      </Card>
    )
  }

  function renderGrid(items, offset = 0) {
    if (items.length === 0) return null
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => renderCard(item, offset + i))}
      </div>
    )
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Vault</h1>
          <p className="page-description">
            Upload and store your learning materials
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add resource
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, type, or tags..."
            className="w-full pl-9 pr-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>

        <div className="vault-filters flex gap-2">
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={typeFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonVaultCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            {items.length === 0 ? (
              <EmptyState
                icon={<Database className="h-6 w-6 text-muted-foreground" />}
                title="Your vault is empty"
                description="Save resources, links, documents, and study materials in one place."
                actionLabel="Add resource"
                onAction={() => setModalOpen(true)}
              />
            ) : (
              <EmptyState
                icon={<Database className="h-6 w-6 text-muted-foreground" />}
                title="No results found"
                description="Try different keywords or add more notes and resources."
              />
            )}
          </CardContent>
        </Card>
      ) : grouped ? (
        <div className="space-y-8">
          {TYPE_ORDER.map((type, gi) => {
            const group = grouped[type]
            if (!group) return null
            const Icon = TYPE_ICONS[type]
            return (
              <section key={type}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {SECTION_LABELS[type]} ({group.length})
                  </h2>
                </div>
                {renderGrid(group, gi * 100)}
              </section>
            )
          })}
        </div>
      ) : (
        renderGrid(sorted)
      )}

      <AddResourceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete resource?"
        description="This resource will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
