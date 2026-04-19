import * as React from "react"
import { cn } from "../lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  /** Lucide icon or any component accepting className */
  icon?: React.ReactNode
  /** Action buttons rendered on the right (wraps on mobile) */
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

/**
 * Responsive page header with title, description, icon, and action buttons.
 * Stacks vertically on mobile, horizontal layout on lg+.
 */
function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg",
        className,
      )}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-medium text-foreground mb-2 sm:mb-3 tracking-tight">
            {title}
          </h1>
          {description && (
            <div className="text-muted-foreground text-base sm:text-lg flex items-center">
              {icon && (
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-2 sm:mr-3 shadow-sm shrink-0">
                  {icon}
                </div>
              )}
              <span>{description}</span>
            </div>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

export { PageHeader }
export type { PageHeaderProps }
