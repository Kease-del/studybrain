import { useState } from "react"
import {
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import ConfirmDialog from "@/components/ConfirmDialog"
import { cn } from "@/lib/utils"

function friendlyTime(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((today - day) / 86400000)
  if (diff <= 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff < 7) return "This week"
  return "Older"
}

function SessionList({
  collapsed,
  interactive,
  sessions,
  activeSessionId,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState("")
  const [menuId, setMenuId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const beginRename = (s) => {
    setEditingId(s.id)
    setDraft(s.title)
    setMenuId(null)
  }

  const commitRename = () => {
    if (editingId && draft.trim()) {
      onRename(editingId, draft.trim())
    }
    setEditingId(null)
    setDraft("")
  }

  return (
    <div className="flex min-h-full flex-col gap-2">
      {/* New Chat */}
      <Button
        variant="secondary"
        size={collapsed ? "icon" : "default"}
        onClick={onNewChat}
        aria-label="New Chat"
        className={cn(
          "shrink-0 shadow-button transition-all duration-200",
          collapsed ? "h-10 w-10 rounded-xl" : "w-full justify-start rounded-xl px-3"
        )}
      >
        <Plus className={cn("h-4 w-4", !collapsed && "mr-2")} />
        {!collapsed && <span>New Chat</span>}
      </Button>

      {sessions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No conversations yet
          </p>
          <p className="text-xs text-muted-foreground">
            Create a new chat to begin.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {sessions.map((s) => {
            const active = s.id === activeSessionId
            const editing = editingId === s.id
            const menuOpen = menuId === s.id
            return (
              <div
                key={s.id}
                className={cn("group relative", collapsed ? "w-full" : "w-full")}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") commitRename()
                  }}
                  aria-current={active ? "true" : undefined}
                  aria-label={collapsed ? s.title : undefined}
                  title={collapsed ? s.title : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors duration-150",
                    collapsed && "justify-center px-0",
                    interactive && !collapsed && "pr-9",
                    active
                      ? "bg-gradient-to-r from-primary/10 to-primary/5 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  {!collapsed &&
                    (editing ? (
                      <input
                        value={draft}
                        autoFocus
                        onChange={(e) => setDraft(e.target.value)}
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename()
                          if (e.key === "Escape") {
                            setEditingId(null)
                            setDraft("")
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Rename session"
                        className="min-w-0 flex-1 rounded-md border border-input bg-background px-1.5 py-0.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    ) : (
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{s.title}</span>
                        <span className="block truncate text-xs text-muted-foreground/70">
                          {friendlyTime(s.updatedAt)}
                        </span>
                      </span>
                    ))}
                </button>

                {!collapsed && !editing && interactive && (
                  <button
                    type="button"
                    aria-label={`Actions for ${s.title}`}
                    className={cn(
                      "absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto focus:opacity-100",
                      menuOpen && "opacity-100 pointer-events-auto"
                    )}
                    onClick={() => setMenuId(menuOpen ? null : s.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                )}

                {active && !collapsed && editing && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Press Enter to save
                  </span>
                )}

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuId(null)
                      }}
                    />
                    <div className="absolute right-1 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border bg-popover p-1 shadow-xl">
                      <button
                        type="button"
                        onClick={() => beginRename(s)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-accent"
                      >
                        <Pencil className="h-4 w-4" />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(s.id)
                          setMenuId(null)
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete chat?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}

export default function ChatSessionSidebar({
  collapsed,
  onToggleCollapse,
  sessions,
  activeSessionId,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
  open,
  onClose,
}) {
  const panelContent = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          {!collapsed && (
            <span className="text-sm font-semibold">Chats</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-clip overflow-y-auto">
        <SessionList
          collapsed={collapsed}
          interactive
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewChat={onNewChat}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
        />
      </div>
    </>
  )

  return (
    <>
      {/* Desktop floating panel */}
      <aside
        className={cn(
          "relative z-0 hidden h-full min-h-0 flex-col rounded-2xl border bg-card/60 backdrop-blur-xl shadow-xl transition-all duration-300 ease-in-out lg:flex",
          "dark:border-white/10",
          collapsed ? "w-16 items-center px-2 py-3" : "w-72 gap-3 p-3"
        )}
      >
        {panelContent}
      </aside>

      {/* Mobile slide-over drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "transition-opacity duration-200",
            open ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          {open && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />
          )}
        </div>

        <div
          className={cn(
            "fixed inset-y-0 left-0 flex w-72 max-w-[82vw] flex-col border-r bg-card p-3 shadow-2xl transition-transform duration-300 ease-out dark:border-white/10",
            open ? "translate-x-0" : "-translate-x-full"
          )}
          aria-hidden={!open}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Chats</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={onClose}
              aria-label="Close chat sessions"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SessionList
              collapsed={false}
              interactive
              sessions={sessions}
              activeSessionId={activeSessionId}
              onNewChat={onNewChat}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
            />
          </div>
        </div>
      </div>
    </>
  )
}