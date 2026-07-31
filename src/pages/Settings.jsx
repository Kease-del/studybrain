import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/hooks/useTheme"
import { resetChatSession } from "@/services/analytics"
import { exportData, downloadBackup, validateBackup, importData } from "@/services/backup"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ConfirmDialog from "@/components/ConfirmDialog"
import {
  User,
  Mail,
  Cpu,
  MessageSquare,
  Database,
  Download,
  Upload,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Loader2,
  Play,
} from "lucide-react"
import toast from "react-hot-toast"

const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || "not configured"
const AI_MODEL = import.meta.env.VITE_AI_MODEL || "default"

function SettingsSection({ title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

export default function Settings() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState(null)
  const [importWarning, setImportWarning] = useState("")
  const fileInputRef = useRef(null)

  function handleClearChat() {
    if (user?.email) {
      localStorage.removeItem(`studybrain_chat_${user.email}`)
    }
    resetChatSession(user?.email)
    setClearConfirmOpen(false)
    toast.success("Chat history cleared")
  }

  function handleExport() {
    const data = exportData(user?.email)
    downloadBackup(data)
    toast.success("Backup downloaded")
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    const reader = new FileReader()

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        const result = validateBackup(data)

        if (!result.valid) {
          toast.error(result.error)
          setImporting(false)
          return
        }

        if (result.warning) {
          setImportWarning(result.warning)
        }

        setPendingImport(data)
        setImportConfirmOpen(true)
      } catch {
        toast.error("Invalid backup file. Could not parse JSON.")
      }
      setImporting(false)
    }

    reader.onerror = () => {
      toast.error("Failed to read file.")
      setImporting(false)
    }

    reader.readAsText(file)

    e.target.value = ""
  }

  function handleImportConfirm() {
    if (!pendingImport) return

    importData(pendingImport, user?.email)
    setImportConfirmOpen(false)
    setPendingImport(null)
    setImportWarning("")

    if (importWarning) {
      toast(importWarning, { icon: "⚠️" })
    }

    toast.success("Data imported successfully. Reloading...")
    setTimeout(() => window.location.reload(), 1200)
  }

  function handleReplayOnboarding() {
    if (user?.email) {
      localStorage.removeItem(`studybrain_onboarding_${user.email}`)
    }
    toast.success("Onboarding will show on next visit")
    navigate("/dashboard")
  }

  return (
    <div className="page-container max-w-2xl space-y-8">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">
          Manage your account and preferences
        </p>
      </div>

      <SettingsSection
        title="Profile"
        description="Your account information"
      >
        <div className="space-y-2">
          <label
            htmlFor="settings-name"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            Name
          </label>
          <input
            id="settings-name"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={user?.name || ""}
            readOnly
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="settings-email"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email
          </label>
          <input
            id="settings-email"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={user?.email || ""}
            readOnly
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="AI Settings"
        description="Configured AI provider and model"
        icon={Cpu}
      >
        <div className="space-y-3">
          <div className="settings-row flex items-center justify-between rounded-lg border bg-accent/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Provider</span>
            </div>
            <span className="text-sm capitalize text-muted-foreground">
              {AI_PROVIDER}
            </span>
          </div>
          <div className="settings-row flex items-center justify-between rounded-lg border bg-accent/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Model</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {AI_MODEL}
            </span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Appearance"
        description="Customize your display preferences"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Theme</label>
          <div className="settings-theme-row flex gap-2">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon
              return (
                <Button
                  key={opt.value}
                  variant={theme === opt.value ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setTheme(opt.value)}
                >
                  <Icon className="h-4 w-4" />
                  {opt.label}
                </Button>
              )
            })}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Chat"
        description="Manage your chat history"
      >
        <div className="settings-row flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Clear chat history</p>
              <p className="text-xs text-muted-foreground">
                Remove all messages and reset session count
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setClearConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Data Management"
        description="Export or import your study data"
      >
        <div className="space-y-4">
          <div className="settings-row flex items-center gap-3">
            <Database className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Export backup</p>
              <p className="text-xs text-muted-foreground">
                Download all your notes, vault items, goals, chat history,
                settings, and analytics as a single JSON file.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="settings-row flex items-center gap-3">
            <Database className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Import backup</p>
              <p className="text-xs text-muted-foreground">
                Restore data from a previous backup. This will replace all
                your current data.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Onboarding"
        description="Restart the guided tour"
      >
        <div className="settings-row flex items-center gap-3">
          <Play className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Replay onboarding</p>
            <p className="text-xs text-muted-foreground">
              Show the welcome tour again on your next visit to the dashboard.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={handleReplayOnboarding}
          >
            <Play className="h-4 w-4" />
            Replay
          </Button>
        </div>
      </SettingsSection>

      <ConfirmDialog
        isOpen={clearConfirmOpen}
        title="Clear chat history?"
        description="All messages will be permanently removed. This action cannot be undone."
        confirmLabel="Clear"
        onConfirm={handleClearChat}
        onCancel={() => setClearConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={importConfirmOpen}
        title="Import backup?"
        description={
          importWarning
            ? importWarning +
              " This will replace all your current notes, vault items, goals, chat history, settings, and analytics. This cannot be undone."
            : "This will replace all your current notes, vault items, goals, chat history, settings, and analytics. This cannot be undone."
        }
        confirmLabel="Import"
        variant="default"
        onConfirm={handleImportConfirm}
        onCancel={() => {
          setImportConfirmOpen(false)
          setPendingImport(null)
          setImportWarning("")
        }}
      />
    </div>
  )
}
