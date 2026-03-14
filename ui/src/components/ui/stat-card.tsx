import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const colorMap = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    label: 'text-primary',
  },
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-400/20',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'text-blue-700 dark:text-blue-300',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-400/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'text-emerald-700 dark:text-emerald-300',
  },
  green: {
    bg: 'bg-green-500/10 dark:bg-green-400/20',
    text: 'text-green-600 dark:text-green-400',
    label: 'text-green-800 dark:text-green-300',
  },
  red: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    label: 'text-destructive',
  },
  orange: {
    bg: 'bg-orange-500/10 dark:bg-orange-400/20',
    text: 'text-orange-600 dark:text-orange-400',
    label: 'text-orange-700 dark:text-orange-300',
  },
  violet: {
    bg: 'bg-violet-500/10 dark:bg-violet-400/20',
    text: 'text-violet-600 dark:text-violet-400',
    label: 'text-violet-700 dark:text-violet-300',
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-400/20',
    text: 'text-purple-600 dark:text-purple-400',
    label: 'text-purple-800 dark:text-purple-300',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-400/20',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'text-amber-700 dark:text-amber-300',
  },
  cyan: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-400/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    label: 'text-cyan-700 dark:text-cyan-300',
  },
} as const;

export type StatCardColor = keyof typeof colorMap;

interface StatCardProps {
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: StatCardColor;
  /** Custom icon element instead of LucideIcon (e.g. emoji span) */
  iconElement?: React.ReactNode;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color = 'primary',
  iconElement,
  className,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        'bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300',
        className,
      )}
    >
      <div className="flex items-center space-x-3 mb-4">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shadow-sm',
            colors.bg,
          )}
        >
          {iconElement ?? <Icon className={cn('w-6 h-6', colors.text)} />}
        </div>
        <div className={cn('text-sm font-semibold tracking-wide', colors.label)}>
          {label}
        </div>
      </div>
      <div className="text-3xl font-bold text-foreground mb-2">{value}</div>
      {subtitle && (
        <p className={cn('text-sm font-medium', colors.label)}>{subtitle}</p>
      )}
    </div>
  );
}
