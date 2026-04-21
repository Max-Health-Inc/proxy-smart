import * as React from "react"
import { cn } from "../lib/utils"
import { TabsList, type tabsListVariants } from "./tabs"
import type { VariantProps } from "class-variance-authority"

const gridColsMap: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
  7: "md:grid-cols-7",
  8: "md:grid-cols-8",
}

interface ResponsiveTabsListProps
  extends React.ComponentProps<typeof TabsList>,
    VariantProps<typeof tabsListVariants> {
  /**
   * Number of columns for the desktop grid layout (2–8).
   * On mobile (<md), tabs scroll horizontally instead.
   */
  columns?: number
}

/**
 * A responsive tabs list that scrolls horizontally on mobile
 * and uses a CSS grid on md+ screens.
 *
 * Drop-in replacement for `<TabsList className="grid w-full grid-cols-N ...">`.
 */
function ResponsiveTabsList({
  className,
  columns,
  children,
  ...props
}: ResponsiveTabsListProps) {
  return (
    <TabsList
      className={cn(
        // Mobile: horizontal scroll rail
        "flex w-full overflow-x-auto scrollbar-hide snap-x snap-mandatory",
        "bg-muted/50 rounded-t-2xl",
        // Desktop: grid layout
        "md:grid md:w-full",
        columns && gridColsMap[columns],
        className,
      )}
      {...props}
    >
      {children}
    </TabsList>
  )
}

export { ResponsiveTabsList }
export type { ResponsiveTabsListProps }
