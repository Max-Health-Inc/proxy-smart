import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@max-health-inc/shared-ui';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface PageErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

function PageErrorState({
  title,
  message,
  onRetry,
  retryLabel,
  className,
}: PageErrorStateProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('Something went wrong');
  const resolvedRetryLabel = retryLabel ?? t('Try Again');
  return (
    <div className={cn('p-8 flex items-center justify-center min-h-[400px]', className)}>
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{resolvedTitle}</h3>
        {message && <p className="text-muted-foreground mb-4">{message}</p>}
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {resolvedRetryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export { PageErrorState };
export type { PageErrorStateProps };