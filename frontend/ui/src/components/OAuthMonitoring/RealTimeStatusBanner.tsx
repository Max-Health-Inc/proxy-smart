import { Badge, Button } from '@proxy-smart/shared-ui';
import { Activity, AlertTriangle, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { oauthWebSocketService } from '../../service/oauth-websocket-service';

interface RealTimeStatusBannerProps {
  isActive: boolean;
  connectionMode: 'websocket' | 'sse';
  onToggle: () => void;
  onSwitchMode: (mode: 'websocket' | 'sse') => void;
}

const styles = {
  active: {
    heading: 'text-lg font-bold text-green-900 dark:text-green-300 mb-1',
    description: 'text-green-800 dark:text-green-400 font-medium',
    label: 'text-sm text-green-700 dark:text-green-400 mb-2',
    selectedBtn: 'bg-green-500/30 hover:bg-green-500/40 text-green-900 dark:text-green-100 border-green-500/50 font-semibold shadow-sm',
    unselectedBtn: 'bg-green-500/10 hover:bg-green-500/15 text-green-700/70 dark:text-green-400/70 border-green-500/20 font-medium',
    badge: 'bg-green-500/20 text-green-800 dark:text-green-300 border-green-500/30 font-semibold',
  },
  paused: {
    heading: 'text-lg font-bold text-orange-900 dark:text-orange-300 mb-1',
    description: 'text-orange-800 dark:text-orange-400 font-medium',
    label: 'text-sm text-orange-700 dark:text-orange-400 mb-2',
    selectedBtn: 'bg-orange-500/30 hover:bg-orange-500/40 text-orange-900 dark:text-orange-100 border-orange-500/50 font-semibold shadow-sm',
    unselectedBtn: 'bg-orange-500/10 hover:bg-orange-500/15 text-orange-700/70 dark:text-orange-400/70 border-orange-500/20 font-medium',
    badge: 'bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30 font-semibold',
  },
} as const;

export function RealTimeStatusBanner({ isActive, connectionMode, onToggle: _onToggle, onSwitchMode }: RealTimeStatusBannerProps) {
  const { t } = useTranslation();
  const isFallback = oauthWebSocketService.isUsingSSE && connectionMode === 'websocket';
  const actualMode = oauthWebSocketService.connectionMode;
  const s = isActive ? styles.active : styles.paused;

  return (
    <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4 shadow-sm">
            {isActive
              ? <Activity className="h-5 w-5 text-green-600 animate-pulse" />
              : <Pause className="h-5 w-5 text-orange-600" />}
          </div>
          <div>
            <h3 className={s.heading}>
              {isActive ? t('Real-time Monitoring Active') : t('Real-time Monitoring Paused')}
            </h3>
            <p className={s.description}>
              {isActive
                ? t('OAuth events are pushed in real time as they occur.')
                : t('Real-time updates are paused. Click Resume to continue monitoring.')}
            </p>
          </div>
        </div>
        <div className="text-right space-y-3">
          <div>
            <div className={s.label}>{t('Connection Mode')}</div>
            <div className="flex items-center gap-2">
              {(['websocket', 'sse'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={connectionMode === mode ? 'default' : 'ghost'}
                  onClick={() => onSwitchMode(mode)}
                  size="sm"
                  className={`text-xs px-3 py-1 h-8 border transition-all ${
                    connectionMode === mode ? s.selectedBtn : s.unselectedBtn
                  }`}
                >
                  {mode === 'websocket' ? 'WebSocket' : 'SSE'}
                </Button>
              ))}
            </div>
            {isFallback && (
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Fallback to SSE (WebSocket failed)
              </div>
            )}
          </div>
          <div>
            <Badge className={s.badge}>
              {isActive ? '' : 'Paused ('}
              {actualMode === 'websocket' ? 'WebSocket Active' : actualMode === 'sse' ? 'SSE Active' : 'Disconnected'}
              {isActive ? '' : ')'}
            </Badge>
            {isFallback && (
              <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 font-semibold mt-1">
                Auto-fallback
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
