import * as React from "react"
import { cn } from "../lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "text-[11px] font-mono uppercase tracking-[0.15em] text-foreground/50 cursor-default peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
