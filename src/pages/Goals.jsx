import { useState, useEffect } from "react"
import { useGoals } from "@/hooks/useGoals"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ConfirmDialog from "@/components/ConfirmDialog"
import AddGoalModal from "@/components/AddGoalModal"
import EmptyState from "@/components/EmptyState"
import { SkeletonGoalCard } from "@/components/Skeleton"
import {
  Target,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
} from "lucide-react"
import toast from "react-hot-toast"
import { formatRelativeTime } from "@/lib/utils"

export default function Goals() {
  const { goals, toggleGoalCompletion, deleteGoal } = useGoals()
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setLoading(false))
    return () => cancelAnimationFrame(raf)
  }, [])

  const incompleteGoals = goals.filter((g) => !g.completed)
  const completedGoals = goals.filter((g) => g.completed)

  function handleToggle(id) {
    toggleGoalCompletion(id)
    const goal = goals.find((g) => g.id === id)
    if (goal) {
      toast.success(goal.completed ? "Goal reopened" : "Goal completed") //toast for goals
    }
  }

  function handleDelete(id) {
    deleteGoal(id)
    setDeleteTarget(null)
    toast.success("Goal deleted")
  }

  function renderGoalCard(goal, index) {
    return (
      <Card
        key={goal.id}
        className="group animate-in fade-in slide-in-from-bottom-2 transition-all duration-200"
        style={{ animationDelay: `${index * 40}ms` }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => handleToggle(goal.id)}
              className="mt-0.5 shrink-0"
              title={goal.completed ? "Mark incomplete" : "Mark complete"}
            >
              {goal.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <h3
                className={`text-sm font-medium leading-snug ${
                  goal.completed
                    ? "text-muted-foreground line-through"
                    : ""
                }`}
              >
                {goal.title}
              </h3>

              {goal.description && (
                <p
                  className={`mt-1.5 text-sm leading-relaxed ${
                    goal.completed
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {goal.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-[11px] text-muted-foreground">
                  Created {formatRelativeTime(goal.createdAt)}
                </p>

                {goal.targetDate && (
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Due {new Date(goal.targetDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setDeleteTarget(goal.id)}
              className="mt-0.5 shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition"
              title="Delete goal"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="page-container space-y-6">
      <div className="page-head-row flex items-start justify-between">
        <div>
          <h1 className="page-title">Goals</h1>
          <p className="text-sm text-muted-foreground">
            Set learning targets and track your progress
          </p>
        </div>

        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New goal
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonGoalCard key={i} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <EmptyState
              icon={<Target className="h-6 w-6 text-muted-foreground" />}
              title="No goals yet"
              description="Set learning targets and track your progress."
              actionLabel="Create your first goal"
              onAction={() => setShowAddModal(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {incompleteGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="section-title">
                Active goals
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({incompleteGoals.length})
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {incompleteGoals.map((g, i) => renderGoalCard(g, i))}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="section-title">
                Completed
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({completedGoals.length})
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {completedGoals.map((g, i) =>
                  renderGoalCard(g, incompleteGoals.length + i)
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <AddGoalModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete goal?"
        description="This goal will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
