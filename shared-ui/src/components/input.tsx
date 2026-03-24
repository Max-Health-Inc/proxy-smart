import * as React from "react"
import { cn } from "../lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full bg-transparent px-3 py-1 text-sm font-light transition-colors duration-300",
        "border border-foreground/10 text-foreground placeholder:text-foreground/30",
        "focus-visible:outline-none focus-visible:border-foreground/40 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-light",
        className
      )}
      {...props}
    />
  )
}

export { Input }
