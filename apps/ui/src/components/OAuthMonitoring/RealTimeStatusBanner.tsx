import { Badge, Button } from '@max-health-inc/shared-ui';
import { Activity, AlertTriangle, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { oauthWebSocketService } from '../../service/oauth-websocket-service';

interface RealTimeStatusBannerProps {
  isActive: boolean;
  connectionMode: 'websocket' | 'sse';
  onToggle: () => void;
  onSwitchMode: (mode: 'websocket' | 'sse') => void;
}

export function RealTimeStatusBanner({ isActive, connectionMode, onToggle: _onToggle, onSwitchMode }: RealTimeStatusBannerProps) {
  const { t } = useTranslation();
  const isFallback = oauthWebSocketService.isUsingSSE && connectionMode === 'websocket';
  const actualMode = oauthWebSocketService.connectionMode;
  const color = isActive ? 'green' : 'orange';

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
            <h3 className={`text-lg font-bold text-${color}-900 dark:text-${color}-300 mb-1`}>
              {isActive ? t('Real-time Monitoring Active') : t('Real-time Monitoring Paused')}
            </h3>
            <p className={`text-${color}-800 dark:text-${color}-400 font-medium`}>
              {isActive
                ? t('OAuth events are pushed in real time as they occur.')
                : t('Real-time updates are paused. Click Resume to continue monitoring.')}
            </p>
          </div>
        </div>
        <div className="text-right space-y-3">
          <div>
            <div className={`text-sm text-${color}-700 dark:text-${color}-400 mb-2`}>{t('Connection Mode')}</div>
            <div className="flex items-center gap-2">
              {(['websocket', 'sse'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={connectionMode === mode ? 'default' : 'ghost'}
                  onClick={() => onSwitchMode(mode)}
                  size="sm"
                  className={`text-xs px-3 py-1 h-8 border transition-all ${
                    connectionMode === mode
                      ? `bg-${color}-500/30 hover:bg-${color}-500/40 text-${color}-900 dark:text-${color}-100 border-${color}-500/50 font-semibold shadow-sm`
                      : `bg-${color}-500/10 hover:bg-${color}-500/15 text-${color}-700/70 dark:text-${color}-400/70 border-${color}-500/20 font-medium`
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
            <Badge className={`bg-${color}-500/20 text-${color}-800 dark:text-${color}-300 border-${color}-500/30 font-semibold`}>
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
