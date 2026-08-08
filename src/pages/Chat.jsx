import { useEffect, useRef, useState } from "react"
import { MessageSquare, Menu, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import ChatMessage from "@/components/ChatMessage"
import ChatInput from "@/components/ChatInput"
import ChatSessionSidebar from "@/components/ChatSessionSidebar"
import TypingIndicator from "@/components/TypingIndicator"
import EmptyState from "@/components/EmptyState"
import ConfirmDialog from "@/components/ConfirmDialog"
import { useChat } from "@/hooks/useChat"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import "../styles/responsive.css"

function sessionMeta(session, count) {
  if (!session) return ""
  const date = new Date(session.createdAt)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((today - day) / 86400000)
  let label
  if (diff <= 0) label = "Today"
  else if (diff === 1) label = "Yesterday"
  else {
    label = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  }
  return `${label} • ${count} message${count === 1 ? "" : "s"}`
}

export default function Chat() {
  const {
    messages,
    sendMessage,
    clearMessages,
    isTyping,
    sessions,
    activeSessionId,
    createSession,
    setActiveSession,
    renameSession,
    deleteSession,
  } = useChat()
  const bottomRef = useRef(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const handleHeaderToggle = () => {
    if (isDesktop) setCollapsed((c) => !c)
    else setSidebarOpen(true)
  }

  const handleNewChat = () => {
    createSession()
    setCollapsed(false)
    setSidebarOpen(false)
  }

  const handleSelectSession = (id) => {
    setActiveSession(id)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-full page-container gap-6">
      <ChatSessionSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelect={handleSelectSession}
        onRename={renameSession}
        onDelete={deleteSession}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="chat-header flex items-center gap-3 border-b pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg lg:hidden"
            onClick={handleHeaderToggle}
            aria-label={isDesktop ? "Toggle sidebar" : "Open chat sessions"}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="page-title truncate text-2xl">
              {activeSession?.title ?? "New Chat"}
            </h1>
            <p className="page-description text-sm">
              {activeSession && sessionMeta(activeSession, messages.length)}
            </p>
          </div>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear chat
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-clip space-y-6 px-1 py-4">
          {messages.length === 0 && !isTyping ? (
            <div className="flex h-full flex-col items-center justify-center">
              <EmptyState
                icon={<MessageSquare className="h-6 w-6 text-muted-foreground" />}
                title="Start a conversation"
                description="Ask questions, review your notes, or learn something new with StudyBrain AI."
                actionLabel="Ask your first question"
                onAction={() => document.querySelector("input")?.focus()}
              />
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className="animate-in fade-in slide-in-from-bottom-3 duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <ChatMessage message={msg} />
                </div>
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <ChatInput onSend={sendMessage} disabled={isTyping} />

        <ConfirmDialog
          isOpen={confirmOpen}
          title="Clear chat?"
          description="All messages will be permanently removed."
          confirmLabel="Clear"
          onConfirm={() => {
            clearMessages()
            setConfirmOpen(false)
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    </div>
  )
}