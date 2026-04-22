import { Edit, Trash2, Activity, Star, StarOff, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '@proxy-smart/shared-ui'
import { useTranslation } from 'react-i18next'
import type { DicomServerWithStatus } from './DicomServersManager'

interface DicomServerCardProps {
  server: DicomServerWithStatus
  onEdit: () => void
  onDelete: () => void
  onProbeStatus: () => void
  onSetDefault: () => void
}

export function DicomServerCard({ server, onEdit, onDelete, onProbeStatus, onSetDefault }: DicomServerCardProps) {
  const { t } = useTranslation()
  const [copiedUrl, setCopiedUrl] = useState(false)

  const copyUrl = () => {
    navigator.clipboard.writeText(server.baseUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const statusBadge = () => {
    if (server.statusLoading) return <Badge variant="outline">{t('Checking...')}</Badge>
    if (!server.status) return <Badge variant="outline">{t('Unknown')}</Badge>
    if (server.status.reachable) return <Badge variant="default" className="bg-green-600">{t('Connected')}</Badge>
    return <Badge variant="destructive">{t('Unreachable')}</Badge>
  }

  const authBadge = () => {
    switch (server.authType) {
      case 'basic': return <Badge variant="secondary">{t('Basic Auth')}</Badge>
      case 'bearer': return <Badge variant="secondary">{t('Bearer Token')}</Badge>
      case 'header': return <Badge variant="secondary">{t('Custom Header')}</Badge>
      default: return <Badge variant="outline">{t('No Auth')}</Badge>
    }
  }

  return (
    <Card className={server.isDefault ? 'border-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              {server.name}
              {server.isDefault && <Badge variant="default" className="text-xs">{t('Default')}</Badge>}
            </CardTitle>
            <div className="flex items-center gap-1 text-sm text-muted-foreground font-mono">
              <span className="truncate max-w-[300px]">{server.baseUrl}</span>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={copyUrl}>
                {copiedUrl ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {statusBadge()}
            {authBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {server.status?.message && (
          <p className="text-xs text-muted-foreground mb-3">{server.status.message}</p>
        )}
        {server.timeoutMs && (
          <p className="text-xs text-muted-foreground mb-3">{t('Timeout')}: {server.timeoutMs}ms</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onProbeStatus} disabled={server.statusLoading}>
            <Activity className="w-3 h-3 mr-1" />
            {t('Check Status')}
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="w-3 h-3 mr-1" />
            {t('Edit')}
          </Button>
          {!server.isDefault && (
            <Button variant="outline" size="sm" onClick={onSetDefault}>
              <Star className="w-3 h-3 mr-1" />
              {t('Set Default')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="w-3 h-3 mr-1" />
            {t('Delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
