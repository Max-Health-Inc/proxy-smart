import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.15em] transition-colors duration-300",
  {
    variants: {
      variant: {
        default:
          "border border-foreground/10 bg-foreground/5 text-foreground/70",
        secondary:
          "border border-foreground/10 bg-transparent text-foreground/50",
        destructive:
          "border border-destructive/20 bg-destructive/10 text-destructive",
        success:
          "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        warning:
          "border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        outline:
          "border border-foreground/10 text-foreground/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
