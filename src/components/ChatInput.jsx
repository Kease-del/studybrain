import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"


export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("")

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim() || disabled) return
    onSend(text)
    setText("")
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 border-t bg-background px-4 py-4 "
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message... (Enter to send)"
        className="flex-1 h-12"
        disabled={disabled}
      />
      <Button
        type="submit"
        className="h-12 px-6 shrink-0"
        disabled={!text.trim() || disabled}
      >
        <Send className="mr-2 h-4 w-4" />
        Send
      </Button>
    </form>
  )
}
