import { useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const MAX_CHARS = 1000

export default function EditNoteDialog({ note, onSave, onClose }) {
  const [text, setText] = useState(note?.text ?? "")

  const handleCancel = useCallback(() => {
    onClose()
  }, [onClose])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") handleCancel()
    },
    [handleCancel]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  function handleSave() {
    if (!text.trim()) return
    onSave(text.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={handleCancel} />

      <Card className="modal-card relative z-10 w-full max-w-md mx-4 shadow-card-hover animate-in zoom-in-95 duration-150">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Edit note</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <div className="relative">
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-none"
              placeholder="Write your note..."
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) setText(e.target.value)
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSave()
                }
              }}
            />
            <span className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
              {text.length}/{MAX_CHARS}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Ctrl + Enter to save · Esc to cancel
          </p>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!text.trim()}>
            Save
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
