import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@proxy-smart/shared-ui'
import { PageLoadingState } from '@/components/ui/page-loading-state'
import { PageErrorState } from '@/components/ui/page-error-state'
import { useAuth } from '@/stores/authStore'
import { useAlertStore } from '@/stores/alertStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { getStoredToken } from '@/lib/apiClient'
import { config } from '@/config'
import type { DicomServerConfig, DicomServerStatusResponse } from '@/lib/types/api'
import { DicomServerCard } from './DicomServerCard'
import { AddDicomServerDialog } from './AddDicomServerDialog'
import { EditDicomServerDialog } from './EditDicomServerDialog'
import { useTranslation } from 'react-i18next'

export interface DicomServerWithStatus extends DicomServerConfig {
  status?: DicomServerStatusResponse
  statusLoading?: boolean
}

export function DicomServersManager() {
  const { t } = useTranslation()
  const { clientApis } = useAuth()
  const { confirm } = useAlertStore()
  const { notify } = useNotificationStore()

  const [servers, setServers] = useState<DicomServerWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingServer, setEditingServer] = useState<DicomServerWithStatus | null>(null)

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const resp = await clientApis.admin.getAdminDicomServers()
      setServers((resp.servers ?? []).map(s => ({ ...s })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DICOM servers')
    } finally {
      setLoading(false)
    }
  }, [clientApis])

  useEffect(() => { fetchServers() }, [fetchServers])

  const handleAdd = async (body: { name: string; baseUrl: string; authType?: string; username?: string; password?: string; authHeader?: string; wadoRoot?: string; qidoRoot?: string; timeoutMs?: number; isDefault?: boolean }) => {
    await clientApis.admin.postAdminDicomServers({ addDicomServerRequest: body as any })
    notify({ type: 'success', message: t('DICOM server added') })
    setShowAddDialog(false)
    await fetchServers()
  }

  const handleUpdate = async (serverId: string, body: Record<string, unknown>) => {
    await clientApis.admin.putAdminDicomServersByServerId({ serverId, updateDicomServerRequest: body as any })
    notify({ type: 'success', message: t('DICOM server updated') })
    setEditingServer(null)
    await fetchServers()
  }

  const handleDelete = (server: DicomServerWithStatus) => {
    confirm({
      title: t('Delete DICOM Server'),
      message: t('Are you sure you want to delete "{{name}}"? This cannot be undone.', { name: server.name }),
      type: 'warning',
      confirmText: t('Delete'),
      onConfirm: async () => {
        try {
          const token = await getStoredToken()
          await fetch(`${config.api.baseUrl}/admin/dicom-servers/${server.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
          notify({ type: 'success', message: t('DICOM server deleted') })
          await fetchServers()
        } catch (err) {
          notify({ type: 'error', message: err instanceof Error ? err.message : 'Delete failed' })
        }
      },
    })
  }

  const handleProbeStatus = async (serverId: string) => {
    setServers(prev => prev.map(s => s.id === serverId ? { ...s, statusLoading: true } : s))
    try {
      const status = await clientApis.admin.getAdminDicomServersByServerIdStatus({ serverId })
      setServers(prev => prev.map(s => s.id === serverId ? { ...s, status, statusLoading: false } : s))
    } catch {
      setServers(prev => prev.map(s => s.id === serverId ? { ...s, statusLoading: false, status: { id: serverId, name: s.name, configured: true, reachable: false, message: 'Status check failed' } } : s))
    }
  }

  const handleSetDefault = async (serverId: string) => {
    await clientApis.admin.putAdminDicomServersByServerId({ serverId, updateDicomServerRequest: { isDefault: true } as any })
    notify({ type: 'success', message: t('Default DICOM server updated') })
    await fetchServers()
  }

  if (loading) return <PageLoadingState message={t('Loading DICOM servers...')} />
  if (error) return <PageErrorState message={error} onRetry={fetchServers} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('DICOM Servers')}</h2>
          <p className="text-sm text-muted-foreground">{t('Manage DICOMweb/PACS server connections')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchServers}>
            <RefreshCw className="w-4 h-4 mr-1" />
            {t('Refresh')}
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            {t('Add Server')}
          </Button>
        </div>
      </div>

      {/* Server list */}
      {servers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">{t('No DICOM servers configured')}</p>
          <p className="text-sm mt-1">{t('Add a DICOMweb/PACS server to enable DICOM imaging features.')}</p>
          <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            {t('Add DICOM Server')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {servers.map(server => (
            <DicomServerCard
              key={server.id}
              server={server}
              onEdit={() => setEditingServer(server)}
              onDelete={() => handleDelete(server)}
              onProbeStatus={() => handleProbeStatus(server.id)}
              onSetDefault={() => handleSetDefault(server.id)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddDicomServerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAdd}
      />
      <EditDicomServerDialog
        open={!!editingServer}
        onOpenChange={(open) => { if (!open) setEditingServer(null) }}
        server={editingServer}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
