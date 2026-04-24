import { useState, useEffect, useCallback } from 'react'
import { HardDrive, RefreshCw, Plus } from 'lucide-react'
import { Button } from '@proxy-smart/shared-ui'
import { PageLoadingState } from '@/components/ui/page-loading-state'
import { PageErrorState } from '@/components/ui/page-error-state'
import { useAuth } from '@/stores/authStore'
import { useAlertStore } from '@/stores/alertStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { getStoredToken } from '@/lib/apiClient'
import { config } from '@/config'
import type { DicomServerConfig, DicomServerStatusResponse } from '@/lib/api-client'
import { DicomServerCard } from './DicomServerCard'
import { DicomStatsCards } from './DicomStatsCards'
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
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      {/* Header */}
      <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
              {t('DICOM Server Management')}
            </h1>
            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <HardDrive className="w-5 h-5 text-primary" />
              </div>
              {t('Manage DICOMweb/PACS server connections')}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-5 h-5 mr-2" />
              {t('Add Server')}
            </Button>
            <Button variant="outline" onClick={fetchServers}>
              <RefreshCw className="w-5 h-5 mr-2" />
              {t('Refresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <DicomStatsCards servers={servers} />

      {/* Server grid */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg p-6">
        {servers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-6 bg-muted/50 rounded-2xl flex items-center justify-center shadow-sm">
              <HardDrive className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">{t('No DICOM servers configured')}</h3>
            <p className="text-muted-foreground mb-6 font-medium">
              {t('Add a DICOMweb/PACS server to enable DICOM imaging features.')}
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-5 h-5 mr-2" />
              {t('Add DICOM Server')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
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
      </div>

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
