import { useEffect, useCallback } from "react"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ConfirmDialog({
  isOpen,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "destructive",
  onConfirm,
  onCancel,
}) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onCancel()
    },
    [onCancel]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <Card className="modal-card relative z-10 w-full max-w-sm mx-4 shadow-card-hover animate-in zoom-in-95 duration-150">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCancel}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            size="sm"
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
