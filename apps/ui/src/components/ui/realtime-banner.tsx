import { Activity, Pause } from 'lucide-react';
import { Badge } from '@max-health-inc/shared-ui';
import { cn } from '@/lib/utils';

interface RealTimeBannerProps {
  isActive: boolean;
  activeTitle?: string;
  pausedTitle?: string;
  activeDescription?: string;
  pausedDescription?: string;
  badgeText?: string;
  pausedBadgeText?: string;
  className?: string;
  children?: React.ReactNode;
}

function RealTimeBanner({
  isActive,
  activeTitle = 'Real-time Monitoring Active',
  pausedTitle = 'Real-time Monitoring Paused',
  activeDescription,
  pausedDescription,
  badgeText,
  pausedBadgeText,
  className,
  children,
}: RealTimeBannerProps) {
  return (
    <div className={cn('bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4 shadow-sm">
            {isActive ? (
              <Activity className="h-5 w-5 text-green-600 animate-pulse" />
            ) : (
              <Pause className="h-5 w-5 text-orange-600" />
            )}
          </div>
          <div>
            <h3 className={cn('text-lg font-bold mb-1', isActive
              ? 'text-green-900 dark:text-green-300'
              : 'text-orange-900 dark:text-orange-300'
            )}>
              {isActive ? activeTitle : pausedTitle}
            </h3>
            {(activeDescription || pausedDescription) && (
              <p className={cn('font-medium', isActive
                ? 'text-green-800 dark:text-green-400'
                : 'text-orange-800 dark:text-orange-400'
              )}>
                {isActive ? activeDescription : pausedDescription}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badgeText && (
            <Badge className={isActive
              ? 'bg-green-500/20 text-green-800 dark:text-green-300 border-green-500/30 font-semibold'
              : 'bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30 font-semibold'
            }>
              {isActive ? badgeText : (pausedBadgeText ?? 'Paused')}
            </Badge>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export { RealTimeBanner };
export type { RealTimeBannerProps };