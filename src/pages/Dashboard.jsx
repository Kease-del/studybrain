import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useNotes } from "@/hooks/useNotes"
import { useVault } from "@/hooks/useVault"
import { useGoals } from "@/hooks/useGoals"
import { useQuickCapture } from "@/hooks/useQuickCapture"
import { getChatSessionCount } from "@/services/analytics"
import OnboardingOverlay from "@/components/OnboardingOverlay"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/EmptyState"
import { useNavigate } from "react-router-dom"
import {
  FileText,
  Database,
  Target,
  MessageSquare,
  BookOpen,
  Plus,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { SkeletonStatCard, SkeletonDashboardNote } from "@/components/Skeleton"
import { formatRelativeTime } from "@/lib/utils"

export default function Dashboard() {
  const { notes } = useNotes()
  const { items: vaultItems } = useVault()
  const { goals } = useGoals()
  const { openCapture } = useQuickCapture()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setLoading(false))
    return () => cancelAnimationFrame(raf)
  }, [])

  const totalGoals = goals.length
  const completedGoals = goals.filter((g) => g.completed).length
  const activeGoals = totalGoals - completedGoals

  const STATS = [
    {
      label: "Notes",
      value: notes.length,
      icon: FileText,
      description: "Total notes created",
    },
    {
      label: "Vault items",
      value: vaultItems.length,
      icon: Database,
      description: "Uploaded materials",
    },
    {
      label: "Goals",
      value: totalGoals,
      icon: Target,
      description: `${activeGoals} active, ${completedGoals} completed`,
    },
    {
      label: "Chat sessions",
      value: getChatSessionCount(user?.email),
      icon: MessageSquare,
      description: "AI conversations",
    },
  ]

  const navigate = useNavigate()

  return (
    <>
      <OnboardingOverlay userEmail={user?.email} />
      <div className="page-container">
      <div className="page-header">
        <h1 className="page-title mb-2">Dashboard</h1>

        <Card className="border-none shadow-sm bg-gradient-to-r from-primary/10 to-accent/20">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold">Welcome back</h2>

            <p className="mt-2 text-muted-foreground">
              Capture ideas, organize knowledge, and build your second brain.
            </p>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-5 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="section-title">Overview</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <SkeletonStatCard key={i} />
              ))
            : STATS.map((stat, i) => (
                <Card
                  key={stat.label}
                  className="group animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardDescription>{stat.label}</CardDescription>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="text-3xl font-bold tracking-tight">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="page-head-row mt-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Notes</h2>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openCapture}>
              <Plus className="mr-1.5 h-4 w-4" />
              Quick note
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/notes")}
            >
              View All
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonDashboardNote key={i} />
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  icon={<FileText className="h-5 w-5 text-muted-foreground" />}
                  title="No notes yet"
                  description="Capture ideas, summaries, and important concepts to build your personal knowledge base."
                />
              </div>
            ) : (
              <div className="space-y-3">
                {notes.slice(0, 5).map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border p-3 hover:bg-accent/40 transition cursor-pointer"
                    onClick={() => navigate("/notes")}
                  >
                    <p className="text-sm line-clamp-2">{note.text}</p>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatRelativeTime(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
    </>
  )
}
