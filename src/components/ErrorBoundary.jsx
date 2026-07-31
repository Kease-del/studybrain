import { Component } from "react"
import { AlertTriangle, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default class ErrorBoundary extends Component {
  state = { hasError: false, message: "", stack: "" }

  componentDidMount() {
    this._onWindowError = (event) => {
      const message = event?.message || ""
      if (!message) return
      const err = event?.error
      console.error("[StudyBrain] Uncaught error:", event)
      this.setState((prev) =>
        prev.hasError
          ? prev
          : {
              hasError: true,
              message: err?.message || message,
              stack: err?.stack || "",
            }
      )
    }

    this._onUnhandledRejection = (event) => {
      const reason = event?.reason
      console.error("[StudyBrain] Unhandled promise rejection:", reason)
      this.setState((prev) =>
        prev.hasError
          ? prev
          : {
              hasError: true,
              message: reason instanceof Error ? reason.message : String(reason ?? "Unknown rejection reason"),
              stack: reason instanceof Error ? reason.stack : "",
            }
      )
    }

    window.addEventListener("error", this._onWindowError)
    window.addEventListener("unhandledrejection", this._onUnhandledRejection)
  }

  componentWillUnmount() {
    window.removeEventListener("error", this._onWindowError)
    window.removeEventListener("unhandledrejection", this._onUnhandledRejection)
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Unknown error",
      stack: error?.stack || "",
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error("[StudyBrain] Component error:", error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            StudyBrain failed to start.
          </h1>
          <p className="w-full break-words rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground">
            {this.state.message}
          </p>
          {this.state.stack && (
            <pre className="max-h-48 w-full overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-3 text-left text-xs text-muted-foreground">
              {this.state.stack}
            </pre>
          )}
          <Button onClick={this.handleReload}>
            <RotateCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
        </div>
      </div>
    )
  }
}
