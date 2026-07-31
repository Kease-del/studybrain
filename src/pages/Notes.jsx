import { useState, useEffect } from "react"
import { useNotes } from "@/hooks/useNotes"
import { useQuickCapture } from "@/hooks/useQuickCapture"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ConfirmDialog from "@/components/ConfirmDialog"
import EditNoteDialog from "@/components/EditNoteDialog"
import EmptyState from "@/components/EmptyState"
import { SkeletonNoteCard } from "@/components/Skeleton"
import { Plus, FileText, Search, Copy, Check, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { formatRelativeTime } from "@/lib/utils"

export default function Notes() {
  const { notes, deleteNote, editNote } = useNotes()
  const { openCapture } = useQuickCapture()
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setLoading(false))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    function handleGlobalShortcut(e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "N") {
        e.preventDefault()
        openCapture()
      }
    }
    document.addEventListener("keydown", handleGlobalShortcut)
    return () => document.removeEventListener("keydown", handleGlobalShortcut)
  }, [openCapture])

  const filteredNotes = notes.filter((note) =>
    note.text.toLowerCase().includes(search.toLowerCase())
  )

  function handleCopy(text, id) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function handleDelete(id) {
    deleteNote(id)
    setDeleteTarget(null)
    toast.success("Note deleted")
  }

  function handleSaveEdit(newText) {
    editNote(editTarget, newText)
    setEditTarget(null)
    toast.success("Note updated")
  }

  return (
    <div className="page-container space-y-6">
      <div className="page-head-row flex items-start justify-between">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="text-sm text-muted-foreground">
            Capture, refine, and organize your thoughts
          </p>
        </div>

        <Button onClick={openCapture} title="New note (Ctrl+Shift+N)">
          <Plus className="mr-2 h-4 w-4" />
          New note
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your notes..."
          className="w-full pl-9 pr-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonNoteCard key={i} />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            {notes.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-6 w-6 text-muted-foreground" />}
                title="No notes yet"
                description="Capture ideas, summaries, and important concepts to build your personal knowledge base."
                actionLabel="Create your first note"
                onAction={openCapture}
              />
            ) : (
              <EmptyState
                icon={<FileText className="h-6 w-6 text-muted-foreground" />}
                title="No results found"
                description="Try different keywords or add more notes and resources."
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note, i) => (
            <Card
              key={note.id}
              className="group hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <CardContent className="p-4 space-y-3">
                <p className="text-sm leading-relaxed line-clamp-4">
                  {note.text}
                </p>

                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(note.createdAt)}
                </p>

                <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition">
                  <p className="text-[10px] text-muted-foreground">
                    {note.text.length} chars
                  </p>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCopy(note.text, note.id)}
                      className="p-1 rounded hover:bg-accent transition"
                      title="Copy note"
                    >
                      {copiedId === note.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>

                    <button
                      onClick={() => setEditTarget(note.id)}
                      className="p-1 rounded hover:bg-accent transition"
                      title="Edit note"
                    >
                      <span className="text-[11px] text-muted-foreground hover:text-blue-500 font-medium">
                        Edit
                      </span>
                    </button>

                    <button
                      onClick={() => setDeleteTarget(note.id)}
                      className="p-1 rounded hover:bg-accent transition"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete note?"
        description="This note will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      {editTarget && (
        <EditNoteDialog
          note={notes.find((n) => n.id === editTarget)}
          onSave={handleSaveEdit}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
