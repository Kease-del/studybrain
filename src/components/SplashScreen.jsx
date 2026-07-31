import { Brain } from "lucide-react"
import { cn } from "@/lib/utils"

export default function SplashScreen({ fadeOut }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-all duration-500",
        fadeOut ? "opacity-0 scale-95" : "opacity-100 scale-100"
      )}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Brain className="h-8 w-8 text-primary-foreground animate-brain-idle" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            StudyBrain
          </h1>
          <p className="mt-2 text-base text-muted-foreground tracking-wider">
            Think. Learn. Remember.
          </p>
        </div>
      </div>
    </div>
  )
}
