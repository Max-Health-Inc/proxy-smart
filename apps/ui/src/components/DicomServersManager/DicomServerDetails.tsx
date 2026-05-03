import {
  HardDrive,
  Check,
  X,
  AlertTriangle,
  Info,
  Globe,
  Lock,
  ExternalLink,
} from 'lucide-react'
import { Badge, Button } from '@max-health-inc/shared-ui'
import { CopyButton } from '@/components/ui/copy-button'
import { useTranslation } from 'react-i18next'
import type { DicomServerWithStatus } from './DicomServersManager'

export function DicomServerDetails({ server }: { server: DicomServerWithStatus }) {
  const { t } = useTranslation()

  const isUnreachable = server.status && !server.status.reachable
  const isConnected = server.status?.reachable

  const statusBadge = () => {
    if (!server.status) {
      return <Badge variant="outline" className="px-4 py-2">{t('Unknown')}</Badge>
    }
    if (server.status.reachable) {
      return (
        <Badge variant="default" className="bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30 shadow-sm px-4 py-2">
          <Check className="w-4 h-4 mr-2" /> {t('Connected')}
        </Badge>
      )
    }
    return (
      <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/30 shadow-sm px-4 py-2">
        <X className="w-4 h-4 mr-2" /> {t('Unreachable')}
      </Badge>
    )
  }

  const authLabel = () => {
    switch (server.authType) {
      case 'basic': return t('Basic Auth')
      case 'bearer': return t('Bearer Token')
      case 'header': return t('Custom Header')
      default: return t('No Authentication')
    }
  }

  return (
    <div className="bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
            isUnreachable ? 'bg-destructive/10' : 'bg-primary/10'
          }`}>
            {isUnreachable
              ? <AlertTriangle className="w-7 h-7 text-destructive" />
              : <HardDrive className="w-7 h-7 text-primary" />
            }
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">{server.name}</h2>
              {server.isDefault && (
                <Badge variant="default" className="bg-primary/10 text-primary border-primary/30 shadow-sm">
                  {t('Default')}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground font-medium">{server.id}</p>
          </div>
        </div>
        {statusBadge()}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Server Information */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                <Info className="w-4 h-4 text-primary" />
              </div>
              {t('Server Information')}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-sm font-semibold text-muted-foreground">{t('Server Name:')}</span>
                <span className="text-sm font-bold text-foreground">{server.name}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-sm font-semibold text-muted-foreground">{t('Server ID:')}</span>
                <span className="text-sm font-bold text-foreground font-mono">{server.id}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-sm font-semibold text-muted-foreground">{t('Authentication:')}</span>
                <span className="text-sm font-bold text-foreground">{authLabel()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-sm font-semibold text-muted-foreground">{t('Timeout:')}</span>
                <span className="text-sm font-bold text-foreground">{server.timeoutMs ? `${server.timeoutMs}ms` : t('Default (30s)')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Details */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-lg flex items-center justify-center mr-3">
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              {t('Connection')}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {t('Base URL:')}
                </span>
                <CopyButton value={server.baseUrl} variant="icon-sm" />
              </div>
              <a
                href={server.baseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-foreground bg-emerald-500/5 dark:bg-emerald-400/5 p-3 rounded-xl font-mono break-all border border-emerald-500/20 dark:border-emerald-400/20 hover:bg-emerald-500/10 transition-colors"
              >
                {server.baseUrl}
              </a>

              {server.wadoRoot && (
                <>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium text-muted-foreground">{t('WADO-RS Root:')}</span>
                    <CopyButton value={server.wadoRoot} variant="icon-xs" />
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg font-mono break-all border border-border/30">
                    {server.wadoRoot}
                  </p>
                </>
              )}

              {server.qidoRoot && (
                <>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium text-muted-foreground">{t('QIDO-RS Root:')}</span>
                    <CopyButton value={server.qidoRoot} variant="icon-xs" />
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg font-mono break-all border border-border/30">
                    {server.qidoRoot}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DICOMweb Endpoints */}
      {isConnected && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-foreground mb-6 flex items-center">
            <div className="w-8 h-8 bg-purple-500/10 dark:bg-purple-400/20 rounded-lg flex items-center justify-center mr-3">
              <ExternalLink className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            {t('DICOMweb Endpoints')}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {[
              { key: 'WADO-RS', url: server.wadoRoot || server.baseUrl },
              { key: 'QIDO-RS', url: server.qidoRoot || server.baseUrl },
              { key: 'STOW-RS', url: server.baseUrl },
            ].map(({ key, url }) => (
              <div key={key} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50 hover:bg-muted/70 transition-all duration-200">
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1">{key}</p>
                  <p className="text-sm text-muted-foreground font-mono break-all">{url}</p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <CopyButton value={url} variant="icon" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(url, '_blank')}
                    className="h-10 px-3 rounded-xl hover:bg-background transition-colors duration-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Message */}
      {server.status?.message && (
        <div className="mt-8">
          <div className={`p-6 rounded-xl border ${
            isUnreachable
              ? 'bg-destructive/10 border-destructive/20'
              : 'bg-emerald-500/5 dark:bg-emerald-400/5 border-emerald-500/20 dark:border-emerald-400/20'
          }`}>
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isUnreachable ? 'bg-destructive/10' : 'bg-emerald-500/10'
              }`}>
                {isUnreachable
                  ? <AlertTriangle className="w-5 h-5 text-destructive" />
                  : <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                }
              </div>
              <div>
                <h4 className={`font-semibold ${isUnreachable ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {isUnreachable ? t('Connection Error') : t('Server Status')}
                </h4>
                <p className={`text-sm ${isUnreachable ? 'text-destructive/80' : 'text-emerald-700/80 dark:text-emerald-300/80'}`}>
                  {server.status.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
