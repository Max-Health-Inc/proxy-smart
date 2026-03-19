import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@proxy-smart/shared-ui';
import { cn } from '@/lib/utils';

interface PageErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

function PageErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  className,
}: PageErrorStateProps) {
  return (
    <div className={cn('p-8 flex items-center justify-center min-h-[400px]', className)}>
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        {message && <p className="text-muted-foreground mb-4">{message}</p>}
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export { PageErrorState };
export type { PageErrorStateProps };