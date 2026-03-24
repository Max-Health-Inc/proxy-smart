import { cn } from '@/lib/utils';

interface PageLoadingStateProps {
  message?: string;
  className?: string;
}

function PageLoadingState({ message = 'Loading...', className }: PageLoadingStateProps) {
  return (
    <div className={cn('p-8 flex items-center justify-center min-h-[400px]', className)}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export { PageLoadingState };
export type { PageLoadingStateProps };
