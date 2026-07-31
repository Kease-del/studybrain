import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center animate-in fade-in slide-in-from-bottom-3 duration-300">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-2" onClick={onAction}>
          <Plus className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
