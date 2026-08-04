import { useState } from "react"
import { Brain, User, Copy, Check } from "lucide-react"
import MarkdownContent from "@/components/MarkdownContent"
import { normalizeMath } from "@/services/mathNormalizer"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import toast from "react-hot-toast"
import { formatRelativeTime } from "@/lib/utils"
import { SOURCE_CLASSES, getSourceClass } from "@/services/sources"

function getSourceBadge(metadata) {
  const sources = metadata?.sources
  if (sources && typeof sources === "object") {
    return SOURCE_CLASSES[getSourceClass(sources)] ?? null
  }
  if (typeof metadata?.source === "string") {
    return SOURCE_CLASSES[metadata.source] ?? null
  }
  return null
}

export default function ChatMessage({ message }) {
  const isUser = message.role === "user"
  const [copied, setCopied] = useState(false)
  const badge = !isUser ? getSourceBadge(message.metadata) : null

  function handleCopy() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={`group flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
        <AvatarFallback
          className={
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-muted-foreground"
          }
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Brain className="h-4 w-4 animate-brain-idle" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={`chat-bubble max-w-[75%] min-w-0 rounded-2xl px-4 py-3 text-[15px] leading-7 [overflow-wrap:break-word] ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-accent text-accent-foreground rounded-tl-sm shadow-sm"
        }`}
      >
        <MarkdownContent>{normalizeMath(message.content)}</MarkdownContent>

        {badge && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        )}

        <div
          className={`mt-2 flex items-center justify-between gap-2 ${
            isUser ? "flex-row-reverse" : ""
          }`}
        >
          <span
            className={`text-[11px] ${
              isUser
                ? "text-primary-foreground/50"
                : "text-muted-foreground"
            }`}
          >
            {formatRelativeTime(message.createdAt)}
          </span>

          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
            title="Copy message"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy
                className={`h-3.5 w-3.5 ${
                  isUser ? "text-primary-foreground/50" : "text-muted-foreground"
                }`}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
