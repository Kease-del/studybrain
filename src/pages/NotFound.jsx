import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { LayoutDashboard } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl font-bold tracking-tight text-muted-foreground/30">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          The page you are looking for does not exist.
        </p>
        <Link to="/dashboard" className="mt-8 inline-block">
          <Button>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Go back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
