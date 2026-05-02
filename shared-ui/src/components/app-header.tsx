import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { LayoutGrid, LogOut } from "lucide-react"
import { Button } from "./button"
import { useBranding } from "../hooks/use-branding"
import { cn } from "../lib/utils"

export interface AppHeaderProps {
  /** App title displayed next to the icon */
  title: string
  /** Lucide icon component used as fallback when no branding logo is configured */
  icon: LucideIcon
  /** Whether the user is currently authenticated (controls Sign Out visibility) */
  authenticated?: boolean
  /** Called when the user clicks Sign Out */
  onSignOut?: () => void
  /** Optional extra content rendered after the title (e.g. a launch-mode badge) */
  children?: ReactNode
  /** Tailwind max-width class for the inner container (default: "max-w-5xl") */
  maxWidth?: string
  /** Hide all action buttons (Sign Out, App Store) — useful for shared/public views */
  hideActions?: boolean
}

export function AppHeader({
  title,
  icon: Icon,
  authenticated,
  onSignOut,
  children,
  maxWidth = "max-w-5xl",
  hideActions,
}: AppHeaderProps) {
  const brand = useBranding()

  return (
    <header className="border-b bg-card">
      <div className={cn(maxWidth, "mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2")}>
        <div className="flex items-center gap-2 min-w-0">
          {brand?.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-5 sm:h-6 w-auto shrink-0" />
          ) : (
            <Icon className="size-5 text-maxhealth shrink-0" />
          )}
          <h1 className="font-semibold truncate text-sm sm:text-base">{title}</h1>
          {children}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!hideActions && (authenticated ? (
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <a href="/apps">
                <LayoutGrid className="size-4" />
                <span className="hidden sm:inline">App Store</span>
              </a>
            </Button>
          ))}
        </div>
      </div>
    </header>
  )
}
