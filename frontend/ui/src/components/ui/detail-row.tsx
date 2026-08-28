import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DetailRowProps {
  label: ReactNode;
  children: ReactNode;
  /** Extra classes for the value, e.g. font-mono or a muted state */
  valueClassName?: string;
}

/** One "label: value" row inside a server details panel. */
export function DetailRow({ label, children, valueClassName }: DetailRowProps) {
  return (
    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-bold text-foreground', valueClassName)}>{children}</span>
    </div>
  );
}
