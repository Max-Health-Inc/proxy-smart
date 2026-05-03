import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@max-health-inc/shared-ui';
import { cn } from '@/lib/utils';

type CopyButtonVariant = 'icon' | 'icon-sm' | 'icon-xs' | 'text';

interface CopyButtonProps {
  value: string;
  variant?: CopyButtonVariant;
  label?: string;
  copiedLabel?: string;
  title?: string;
  className?: string;
}

const sizeMap: Record<CopyButtonVariant, { button: string; icon: string }> = {
  icon: { button: 'h-10 px-3 rounded-xl', icon: 'w-4 h-4' },
  'icon-sm': { button: 'h-8 px-3 rounded-lg', icon: 'w-3 h-3' },
  'icon-xs': { button: 'h-6 px-2 rounded-lg', icon: 'w-2.5 h-2.5' },
  text: { button: '', icon: 'w-3 h-3' },
};

export function CopyButton({
  value,
  variant = 'icon-sm',
  label,
  copiedLabel,
  title,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  const Icon = copied ? Check : Copy;
  const { button: buttonSize, icon: iconSize } = sizeMap[variant];

  if (variant === 'text') {
    return (
      <button
        onClick={handleCopy}
        className={cn(
          'flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors',
          className,
        )}
        title={title}
      >
        <Icon className={iconSize} />
        {copied ? copiedLabel : label}
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={cn(buttonSize, 'hover:bg-muted transition-colors duration-200', className)}
      title={title}
    >
      <Icon className={iconSize} />
    </Button>
  );
}