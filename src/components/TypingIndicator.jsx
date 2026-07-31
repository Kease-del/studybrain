import { Brain } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
        <AvatarFallback className="bg-accent text-muted-foreground">
          <Brain className="h-4 w-4 animate-brain-pulse" />
        </AvatarFallback>
      </Avatar>

      <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm bg-accent text-accent-foreground shadow-sm px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/60 typing-dot" />
          <span
            className="h-2 w-2 rounded-full bg-muted-foreground/60 typing-dot"
            style={{ animationDelay: "200ms" }}
          />
          <span
            className="h-2 w-2 rounded-full bg-muted-foreground/60 typing-dot"
            style={{ animationDelay: "400ms" }}
          />
        </div>
        <span className="text-sm text-muted-foreground">Thinking...</span>
      </div>

      <style>{`
        .typing-dot {
          animation: typing-pulse 1.4s ease-in-out infinite;
        }
        @keyframes typing-pulse {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
