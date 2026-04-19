import * as React from "react"
import { cn } from "../lib/utils"

interface FilterToolbarProps {
  className?: string
  children: React.ReactNode
}

/**
 * Responsive filter toolbar that stacks controls on mobile
 * and lays them out inline on larger screens.
 *
 * Each direct child is treated as a filter control.
 * On mobile: full-width stacked grid.
 * On sm+: 2-column grid.
 * On lg+: inline flex row.
 */
function FilterToolbar({ className, children }: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-end gap-2",
        className,
      )}
    >
      {children}
    </div>
  )
}

interface FilterToolbarItemProps {
  className?: string
  /** If true, this item stretches to fill available space on desktop */
  grow?: boolean
  children: React.ReactNode
}

/**
 * Optional wrapper for individual filter controls inside FilterToolbar.
 * Use `grow` for search inputs that should expand.
 */
function FilterToolbarItem({ className, grow, children }: FilterToolbarItemProps) {
  return (
    <div
      className={cn(
        "w-full lg:w-auto",
        grow && "lg:flex-1 lg:min-w-[200px]",
        className,
      )}
    >
      {children}
    </div>
  )
}

export { FilterToolbar, FilterToolbarItem }
export type { FilterToolbarProps, FilterToolbarItemProps }
