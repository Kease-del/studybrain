import { Link } from "react-router-dom"
import { Brain, ArrowRight, BookOpen, Archive, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="landing-header flex items-center justify-between border-b bg-background/80 backdrop-blur-sm px-8 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            StudyBrain
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link to="/register">
            <Button>Get started</Button>
          </Link>
        </div>
      </header>

      <main className="landing-main flex flex-1 flex-col items-center justify-center px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            Your personal AI knowledge companion
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Your AI-powered
            <br />
            <span className="text-primary">knowledge companion</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground max-w-xl mx-auto">
            Store notes, organize knowledge, track goals, and interact with your
            learning materials through intelligent AI assistance.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg">
                Start learning
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {[
            { icon: BookOpen, label: "Store notes" },
            { icon: Archive, label: "Organize knowledge" },
            { icon: MessageSquare, label: "AI chat" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 shadow-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <item.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
