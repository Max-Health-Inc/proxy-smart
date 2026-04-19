import * as React from "react"
import { cn } from "../lib/utils"

const colorMap = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    label: "text-primary",
  },
  blue: {
    bg: "bg-blue-500/10 dark:bg-blue-400/20",
    text: "text-blue-600 dark:text-blue-400",
    label: "text-blue-700 dark:text-blue-300",
  },
  emerald: {
    bg: "bg-emerald-500/10 dark:bg-emerald-400/20",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "text-emerald-700 dark:text-emerald-300",
  },
  green: {
    bg: "bg-green-500/10 dark:bg-green-400/20",
    text: "text-green-600 dark:text-green-400",
    label: "text-green-800 dark:text-green-300",
  },
  red: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    label: "text-destructive",
  },
  orange: {
    bg: "bg-orange-500/10 dark:bg-orange-400/20",
    text: "text-orange-600 dark:text-orange-400",
    label: "text-orange-700 dark:text-orange-300",
  },
  violet: {
    bg: "bg-violet-500/10 dark:bg-violet-400/20",
    text: "text-violet-600 dark:text-violet-400",
    label: "text-violet-700 dark:text-violet-300",
  },
  purple: {
    bg: "bg-purple-500/10 dark:bg-purple-400/20",
    text: "text-purple-600 dark:text-purple-400",
    label: "text-purple-800 dark:text-purple-300",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-400/20",
    text: "text-amber-600 dark:text-amber-400",
    label: "text-amber-700 dark:text-amber-300",
  },
  cyan: {
    bg: "bg-cyan-500/10 dark:bg-cyan-400/20",
    text: "text-cyan-600 dark:text-cyan-400",
    label: "text-cyan-700 dark:text-cyan-300",
  },
} as const

type StatCardColor = keyof typeof colorMap

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  subtitle?: string
  color?: StatCardColor
  /** Custom icon element instead of icon component (e.g. emoji span) */
  iconElement?: React.ReactNode
  className?: string
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color = "primary",
  iconElement,
  className,
}: StatCardProps) {
  const colors = colorMap[color]

  return (
    <div
      className={cn(
        "bg-card/70 border border-border/50 px-3 py-2 transition-colors duration-200",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-6 h-6 shrink-0 flex items-center justify-center",
            colors.bg,
          )}
        >
          {iconElement ?? <Icon className={cn("w-3 h-3", colors.text)} />}
        </div>
        <div
          className={cn(
            "text-[10px] font-mono uppercase tracking-[0.15em] min-w-0 truncate",
            colors.label,
          )}
        >
          {label}
        </div>
        <div className="ml-auto text-base font-semibold tabular-nums text-foreground">
          {value}
        </div>
      </div>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground font-light mt-0.5 ml-8">
          {subtitle}
        </p>
      )}
    </div>
  )
}

export { StatCard, colorMap }
export type { StatCardProps, StatCardColor }
