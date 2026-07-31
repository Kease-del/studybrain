import { useState, useEffect, useCallback } from "react"
import { X, Calendar } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useGoals } from "@/hooks/useGoals"

export default function AddGoalModal({ isOpen, onClose }) {
  const { addGoal } = useGoals()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [targetDate, setTargetDate] = useState("")

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

  if (!isOpen) return null

  function handleSave() {
    if (!title.trim()) return

    addGoal(title.trim(), description.trim(), targetDate)
    resetAndClose()
    toast.success("Goal created")
  }

  function resetAndClose() {
    setTitle("")
    setDescription("")
    setTargetDate("")
    onClose()
  }

  function handleCancel() {
    resetAndClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={handleCancel} />
      <Card className="modal-card relative z-10 w-full max-w-lg mx-4 shadow-card-hover animate-in zoom-in-95 duration-150">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">New goal</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="goal-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="goal-title"
              placeholder="What do you want to achieve?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="goal-description"
              className="text-sm font-medium"
            >
              Description
            </label>
            <textarea
              id="goal-description"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] resize-none"
              placeholder="Optional details, milestones, or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="goal-date" className="text-sm font-medium">
              Target date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="goal-date"
                type="date"
                className="pl-9"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            Create goal
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
