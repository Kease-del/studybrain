import { useState } from "react"
import {
  Brain,
  FileText,
  Database,
  Target,
  MessageSquare,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    icon: Brain,
    title: "Welcome to StudyBrain",
    description:
      "Your AI-powered knowledge companion. Capture ideas, organize information, and learn smarter with the help of AI.",
  },
  {
    icon: FileText,
    title: "Notes",
    description:
      "Quickly capture ideas, summaries, and important concepts. Your notes are the building blocks of your personal knowledge base.",
  },
  {
    icon: Database,
    title: "Vault",
    description:
      "Store resources, links, documents, and study materials in one place. Tag and organize everything for easy retrieval.",
  },
  {
    icon: Target,
    title: "Goals",
    description:
      "Set learning targets, track your progress, and stay motivated. Complete goals and watch your knowledge grow.",
  },
  {
    icon: MessageSquare,
    title: "AI Assistant",
    description:
      "Ask questions about your saved knowledge. StudyBrain AI answers using your notes and vault to provide personalized help.",
  },
  {
    icon: CheckCircle,
    title: "You're Ready!",
    description:
      "Start exploring StudyBrain. Create your first note, save a resource, set a goal, or chat with the AI assistant.",
  },
]

export default function OnboardingOverlay({ userEmail }) {
  const [step, setStep] = useState(0)
  const [show, setShow] = useState(false)
  const [direction, setDirection] = useState("next")
  const [checkedEmail, setCheckedEmail] = useState(null)

  if (userEmail && userEmail !== checkedEmail) {
    setCheckedEmail(userEmail)
    if (!localStorage.getItem(`studybrain_onboarding_${userEmail}`)) {
      setShow(true)
    }
  }

  function complete() {
    if (userEmail) {
      localStorage.setItem(`studybrain_onboarding_${userEmail}`, "true")
    }
    setShow(false)
  }

  function goNext() {
    if (step === STEPS.length - 1) {
      complete()
      return
    }
    setDirection("next")
    setStep((s) => s + 1)
  }

  function goPrev() {
    setDirection("prev")
    setStep((s) => s - 1)
  }

  if (!show) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="modal-card relative w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="rounded-2xl border bg-card shadow-xl">
          <div className="p-6 pb-0">
            <div className="flex justify-center gap-1.5 mb-6">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    i === step
                      ? "w-6 bg-primary"
                      : i < step
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>
          </div>

          <div
            key={step}
            className={cn(
              "p-6 pt-2 animate-in fade-in duration-200",
              direction === "next"
                ? "slide-in-from-right-4"
                : "slide-in-from-left-4"
            )}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <current.icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  {current.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {current.description}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-center justify-between">
              <div>
                {step > 0 ? (
                  <Button variant="ghost" size="sm" onClick={goPrev}>
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={complete}>
                  Skip
                </Button>
                {isLast ? (
                  <Button size="sm" onClick={complete}>
                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                    Go to Dashboard
                  </Button>
                ) : (
                  <Button size="sm" onClick={goNext}>
                    Next
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
