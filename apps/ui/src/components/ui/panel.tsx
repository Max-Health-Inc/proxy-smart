import * as React from "react"
import { cn } from "@/lib/utils"

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/**
 * Panel component - a simple card-like container
 */
function Panel({ className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-xl border shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Panel }
