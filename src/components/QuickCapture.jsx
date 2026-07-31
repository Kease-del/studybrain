import { useState, useEffect, useCallback } from "react"
import { Plus, X } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useNotes } from "@/hooks/useNotes"
import { useQuickCapture } from "@/hooks/useQuickCapture"

const MAX_CHARS = 1000

export default function QuickCapture() {
  const { isOpen, openCapture, closeCapture } = useQuickCapture()
  const { addNote } = useNotes()
  const [text, setText] = useState("")

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

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") handleCancel()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  function handleSave() {
    if (!text.trim()) return

    addNote(text.trim())
    setText("")
    closeCapture()
    toast.success("Note saved")
  }

  function handleCancel() {
    setText("")
    closeCapture()
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-150">
          <div className="fixed inset-0 bg-black/50" onClick={handleCancel} />

          <Card className="modal-card relative z-10 w-full max-w-md mx-4 shadow-card-hover animate-in zoom-in-95 duration-150">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Quick note</CardTitle>
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
              <Button
                onClick={handleSave}
                disabled={!text.trim()}
              >
                Save
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <Button
        onClick={openCapture}
        className="capture-fab fixed bottom-3 right-3 z-40 h-10 w-10 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200"
        size="icon"
        title="New note (Ctrl+Shift+N)"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  )
}
