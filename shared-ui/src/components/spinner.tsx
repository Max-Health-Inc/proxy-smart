import * as React from "react"
import { cn } from "../lib/utils"

interface SpinnerProps extends React.ComponentProps<"div"> {
  size?: "sm" | "md" | "lg"
}

const sizeClasses = { sm: "size-4", md: "size-6", lg: "size-8" }

function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  return (
    <div
      data-slot="spinner"
      className={cn("animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/70", sizeClasses[size], className)}
      {...props}
    />
  )
}

export { Spinner }
