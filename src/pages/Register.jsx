import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import toast from "react-hot-toast"

export default function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const validateEmail = (value) => {
    const trimmed = value.trim()
    if (!trimmed.includes("@")) {
      return "Email must contain an @ symbol."
    }
    if (!trimmed.endsWith(".com")) {
      return "Email must end with .com."
    }
    return null
  }

  const validatePassword = (value) => {
    if (value.length < 8) {
      return "Password must be at least 8 characters."
    }
    if (!/[A-Z]/.test(value)) {
      return "Password must include a capital letter."
    }
    if (!/\d/.test(value)) {
      return "Password must include a number."
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
      return "Password must include a special symbol."
    }
    return null
  }

  const handleRegister = async () => {
    setError("")

    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      toast.error(emailError)
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      toast.error(passwordError)
      return
    }

    setSubmitting(true)

    const [result] = await Promise.all([
      Promise.resolve(register(name, email, password)),
      new Promise((r) => setTimeout(r, 600)),
    ])

    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
      setSubmitting(false)
      return
    }
    toast.success("Registration successful")
    setSubmitting(false)
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-card">
            <Brain className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start your learning journey with StudyBrain
          </p>
        </div>

        <Card className="shadow-card-hover">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm mb-2">
                {error}
              </p>
            )}
            <Button className="w-full" onClick={handleRegister} disabled={submitting}>
              {submitting ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
