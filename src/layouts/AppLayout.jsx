import { useState } from "react"
import { Outlet, NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  FileText,
  Database,
  Target,
  MessageSquare,
  Settings,
  Brain,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/useAuth"
import { ScrollArea } from "@/components/ui/scroll-area"
import QuickCapture from "@/components/QuickCapture"
import SearchBar from "@/components/SearchBar"

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Notes", path: "/notes", icon: FileText },
  { label: "Vault", path: "/vault", icon: Database },
  { label: "Goals", path: "/goals", icon: Target },
  { label: "Chat", path: "/chat", icon: MessageSquare },
  { label: "Settings", path: "/settings", icon: Settings },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="app-shell flex h-screen">
      <aside
        className={cn(
          "app-sidebar flex flex-col border-r bg-card transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn(
          "flex items-center py-6",
          collapsed ? "justify-center px-0" : "gap-3 px-6"
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span
            className={cn(
              "text-lg font-semibold tracking-tight overflow-hidden whitespace-nowrap transition-all duration-200",
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}
          >
            StudyBrain
          </span>
        </div>

        <Separator />

        <ScrollArea className="flex-1 px-3 py-5">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 bg-primary rounded-r-full transition-all duration-200",
                        isActive
                          ? "h-5 opacity-100"
                          : "h-0 opacity-0"
                      )}
                    />
                    <item.icon
                      className={cn(
                        "h-4.5 w-4.5 shrink-0 transition-all duration-200",
                        !collapsed && "group-hover:scale-110"
                      )}
                    />
                    <span
                      className={cn(
                        "overflow-hidden whitespace-nowrap transition-all duration-200",
                        collapsed
                          ? "w-0 opacity-0"
                          : "w-auto opacity-100"
                      )}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        <Separator />

        <div className="p-4">
          <div className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "gap-3"
          )}>
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border">
              <AvatarFallback className="text-xs font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "flex-1 overflow-hidden transition-all duration-200",
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
            >
              <p className="truncate text-sm font-medium leading-tight">
                {user?.name || "User"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email || "Sign in"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className={cn(
                "h-8 w-8 shrink-0 transition-all duration-200",
                collapsed ? "hidden" : ""
              )}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="app-header flex items-center justify-between border-b px-6 py-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="sidebar-toggle h-8 w-8 text-muted-foreground hover:text-foreground"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
          <SearchBar />
        </header>
        <div
          key={location.pathname}
          className="app-content flex-1 overflow-auto animate-in fade-in slide-in-from-bottom-1 duration-200"
        >
          <Outlet />
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn("mobile-nav-link", isActive && "active")
            }
          >
            <item.icon className="mobile-nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <QuickCapture />
    </div>
  )
}
