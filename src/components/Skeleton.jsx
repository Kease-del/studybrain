export function SkeletonStatCard() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-20 rounded bg-muted-foreground/10" />
        <div className="h-8 w-8 rounded-lg bg-muted-foreground/10" />
      </div>
      <div className="h-7 w-16 rounded bg-muted-foreground/10" />
      <div className="h-3 w-28 rounded bg-muted-foreground/10" />
    </div>
  )
}

export function SkeletonNoteCard() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted-foreground/10" />
        <div className="h-3 w-11/12 rounded bg-muted-foreground/10" />
        <div className="h-3 w-4/5 rounded bg-muted-foreground/10" />
        <div className="h-3 w-3/5 rounded bg-muted-foreground/10" />
      </div>
      <div className="h-3 w-24 rounded bg-muted-foreground/10" />
      <div className="flex items-center justify-between pt-1">
        <div className="h-3 w-12 rounded bg-muted-foreground/10" />
        <div className="flex gap-2">
          <div className="h-5 w-5 rounded bg-muted-foreground/10" />
          <div className="h-5 w-5 rounded bg-muted-foreground/10" />
          <div className="h-5 w-5 rounded bg-muted-foreground/10" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonVaultCard() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-muted-foreground/10" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="h-3.5 w-3/5 rounded bg-muted-foreground/10" />
            <div className="h-3 w-12 rounded bg-muted-foreground/10" />
          </div>
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          <div className="h-5 w-5 rounded bg-muted-foreground/10" />
          <div className="h-5 w-5 rounded bg-muted-foreground/10" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-muted-foreground/10" />
        <div className="h-5 w-20 rounded-full bg-muted-foreground/10" />
        <div className="h-5 w-12 rounded-full bg-muted-foreground/10" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-muted-foreground/10" />
        <div className="h-3 w-4/5 rounded bg-muted-foreground/10" />
      </div>
      <div className="h-3 w-20 rounded bg-muted-foreground/10" />
    </div>
  )
}

export function SkeletonGoalCard() {
  return (
    <div className="rounded-xl border bg-card p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-muted-foreground/10" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-2/5 rounded bg-muted-foreground/10" />
          <div className="space-y-1">
            <div className="h-3 w-full rounded bg-muted-foreground/10" />
            <div className="h-3 w-4/5 rounded bg-muted-foreground/10" />
          </div>
          <div className="flex gap-3 pt-1">
            <div className="h-3 w-28 rounded bg-muted-foreground/10" />
            <div className="h-3 w-24 rounded bg-muted-foreground/10" />
          </div>
        </div>
        <div className="mt-0.5 h-5 w-5 shrink-0 rounded bg-muted-foreground/10" />
      </div>
    </div>
  )
}

export function SkeletonDashboardNote() {
  return (
    <div className="rounded-lg border p-3 space-y-2 animate-pulse">
      <div className="h-3 w-full rounded bg-muted-foreground/10" />
      <div className="h-3 w-4/5 rounded bg-muted-foreground/10" />
      <div className="h-3 w-20 rounded bg-muted-foreground/10 mt-2" />
    </div>
  )
}

export function SkeletonLine({ className = "" }) {
  return (
    <div
      className={`h-3 w-full rounded bg-muted-foreground/10 ${className}`}
    />
  )
}
