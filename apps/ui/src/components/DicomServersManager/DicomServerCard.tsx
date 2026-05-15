import {
  Edit,
  Trash2,
  Activity,
  Star,
  HardDrive,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Eye,
} from 'lucide-react'
import { Badge, Button } from '@proxy-smart/shared-ui'
import { CopyButton } from '@/components/ui/copy-button'
import { useTranslation } from 'react-i18next'
import type { DicomServerWithStatus } from './DicomServersManager'

interface DicomServerCardProps {
  server: DicomServerWithStatus
  onEdit: () => void
  onDelete: () => void
  onProbeStatus: () => void
  onSetDefault: () => void
  onViewDetails: () => void
}

export function DicomServerCard({ server, onEdit, onDelete, onProbeStatus, onSetDefault, onViewDetails }: DicomServerCardProps) {
  const { t } = useTranslation()

  const statusBadge = () => {
    if (server.statusLoading) {
      return (
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30 shadow-sm">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          {t('Checking...')}
        </Badge>
      )
    }
    if (!server.status) {
      return <Badge variant="outline">{t('Unknown')}</Badge>
    }
    if (server.status.reachable) {
      return (
        <Badge variant="default" className="bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30 shadow-sm">
          <Check className="w-3 h-3 mr-1" /> {t('Connected')}
        </Badge>
      )
    }
    return (
      <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/30 shadow-sm">
        <X className="w-3 h-3 mr-1" /> {t('Unreachable')}
      </Badge>
    )
  }

  const authLabel = () => {
    switch (server.authType) {
      case 'basic': return t('Basic Auth')
      case 'bearer': return t('Bearer Token')
      case 'header': return t('Custom Header')
      default: return t('No Auth')
    }
  }

  const isUnreachable = server.status && !server.status.reachable

  return (
    <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
            isUnreachable ? 'bg-destructive/10' : 'bg-primary/10'
          }`}>
            {isUnreachable
              ? <AlertTriangle className="w-6 h-6 text-destructive" />
              : <HardDrive className="w-6 h-6 text-primary" />
            }
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-foreground tracking-tight">{server.name}</h3>
              {server.isDefault && (
                <Badge variant="default" className="bg-primary/10 text-primary border-primary/30 shadow-sm text-xs">
                  {t('Default')}
                </Badge>
              )}
            </div>
            {server.status?.message && (
              <p className="text-sm text-muted-foreground font-medium">{server.status.message}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {statusBadge()}
        </div>
      </div>

      {/* Info rows */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 p-3 rounded-xl">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Authentication')}</span>
            <p className="text-sm font-bold text-foreground mt-1">{authLabel()}</p>
          </div>
          <div className="bg-muted/50 p-3 rounded-xl">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Timeout')}</span>
            <p className="text-sm font-bold text-foreground mt-1">{server.timeoutMs ? `${server.timeoutMs}ms` : t('Default')}</p>
          </div>
        </div>

        {/* Base URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('Base URL:')}</span>
            <CopyButton value={server.baseUrl} variant="icon-xs" />
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg font-mono break-all border border-border/30">
            {server.baseUrl}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border-border hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Eye className="w-3 h-3" />
            <span>{t('View Details')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onProbeStatus}
            disabled={server.statusLoading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Activity className="w-3 h-3" />
            <span>{t('Check Status')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border-border hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Edit className="w-3 h-3" />
            <span>{t('Edit')}</span>
          </Button>
          {!server.isDefault && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSetDefault}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl border-border hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Star className="w-3 h-3" />
              <span>{t('Set Default')}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Trash2 className="w-3 h-3" />
            <span>{t('Delete')}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
