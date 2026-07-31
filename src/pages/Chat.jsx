import { useEffect, useRef, useState } from "react"
import { MessageSquare, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import ChatMessage from "@/components/ChatMessage"
import ChatInput from "@/components/ChatInput"
import TypingIndicator from "@/components/TypingIndicator"
import EmptyState from "@/components/EmptyState"
import ConfirmDialog from "@/components/ConfirmDialog"
import { useChat } from "@/hooks/useChat"
import "../styles/responsive.css"

export default function Chat() {
  const { messages, sendMessage, clearMessages, isTyping } = useChat()
  const bottomRef = useRef(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  return (
    <div className="flex h-full flex-col page-container">
      <div className="chat-header flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="page-title">StudyBrain AI</h1>
          <p className="page-description">
            Ask questions about your knowledge base
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
  )
}
