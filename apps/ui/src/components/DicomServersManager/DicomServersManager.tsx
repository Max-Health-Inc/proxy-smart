import { useState, useEffect, useCallback } from 'react'
import { HardDrive, RefreshCw, Plus, Info, Eye } from 'lucide-react'
import { Button, Tabs, TabsContent, TabsTrigger, ResponsiveTabsList, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from '@proxy-smart/shared-ui'
import { LoadingButton } from '@/components/ui/loading-button'
import { PageLoadingState } from '@/components/ui/page-loading-state'
import { PageErrorState } from '@/components/ui/page-error-state'
import { useAuth } from '@/stores/authStore'
import { useAlertStore } from '@/stores/alertStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { adminApiCall } from '@/lib/admin-api'
import type { DicomServerConfig, DicomServerStatusResponse, AddDicomServerRequest, UpdateDicomServerRequest, SmartApp } from '@/lib/api-client'
import { DicomStatsCards } from './DicomStatsCards'
import { DicomServerOverview } from './DicomServerOverview'
import { DicomServerDetails } from './DicomServerDetails'
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
  const [selectedServer, setSelectedServer] = useState<DicomServerWithStatus | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [smartApps, setSmartApps] = useState<SmartApp[]>([])
  const [viewerAppClientId, setViewerAppClientId] = useState<string>('')
  const [savingViewerApp, setSavingViewerApp] = useState(false)

  // ── Auto-probe all servers after loading ───────────────────────────
  const probeAllServers = useCallback(async (serverList: DicomServerWithStatus[]) => {
    for (const server of serverList) {
      try {
        setServers(prev => prev.map(s => s.id === server.id ? { ...s, statusLoading: true } : s))
        const status = await clientApis.admin.getAdminDicomServersByServerIdStatus({ serverId: server.id })
        setServers(prev => prev.map(s => s.id === server.id ? { ...s, status, statusLoading: false } : s))
      } catch {
        setServers(prev => prev.map(s => s.id === server.id
          ? { ...s, statusLoading: false, status: { id: server.id, name: server.name, configured: true, reachable: false, message: 'Status check failed' } }
          : s
        ))
      }
    }
  }, [clientApis])

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const resp = await clientApis.admin.getAdminDicomServers()
      const serverList = (resp.servers ?? []).map(s => ({ ...s }))
      setServers(serverList)
      // Fetch SMART apps for viewer selector (non-blocking)
      clientApis.smartApps.getAdminSmartApps()
        .then(apps => setSmartApps(Array.isArray(apps) ? apps : []))
        .catch(() => { /* ignore — selector will just be empty */ })
      // Fetch current viewer app setting (non-blocking)
      adminApiCall<{ viewerAppClientId: string | null }>('/admin/dicom-servers/viewer-app')
        .then(res => setViewerAppClientId(res.viewerAppClientId ?? ''))
        .catch(() => { /* ignore */ })
      // Auto-probe reachability after load (non-blocking)
      probeAllServers(serverList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DICOM servers')
    } finally {
      setLoading(false)
    }
  }, [clientApis, probeAllServers])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  // ── CRUD handlers ──────────────────────────────────────────────────

  const handleAdd = async (body: AddDicomServerRequest) => {
    await clientApis.admin.postAdminDicomServers({ addDicomServerRequest: body })
    notify({ type: 'success', message: t('DICOM server added') })
    setShowAddDialog(false)
    await fetchServers()
  }

  const handleUpdate = async (serverId: string, body: UpdateDicomServerRequest) => {
    await clientApis.admin.putAdminDicomServersByServerId({ serverId, updateDicomServerRequest: body })
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
          await clientApis.admin.deleteAdminDicomServersByServerId({ serverId: server.id })
          notify({ type: 'success', message: t('DICOM server deleted') })
          // Clear detail view if the deleted server was selected
          if (selectedServer?.id === server.id) setSelectedServer(null)
          await fetchServers()
        } catch (err) {
          notify({ type: 'error', message: err instanceof Error ? err.message : t('Delete failed') })
        }
      },
    })
  }

  const handleProbeStatus = async (serverId: string) => {
    setServers(prev => prev.map(s => s.id === serverId ? { ...s, statusLoading: true } : s))
    try {
      const status = await clientApis.admin.getAdminDicomServersByServerIdStatus({ serverId })
      setServers(prev => prev.map(s => s.id === serverId ? { ...s, status, statusLoading: false } : s))
      // Also update selected server if viewing details
      if (selectedServer?.id === serverId) {
        setSelectedServer(prev => prev ? { ...prev, status, statusLoading: false } : null)
      }
    } catch {
      setServers(prev => prev.map(s => s.id === serverId
        ? { ...s, statusLoading: false, status: { id: serverId, name: s.name, configured: true, reachable: false, message: 'Status check failed' } }
        : s
      ))
    }
  }

  const handleViewerAppChange = async (clientId: string) => {
    setViewerAppClientId(clientId)
    setSavingViewerApp(true)
    try {
      await adminApiCall('/admin/dicom-servers/viewer-app', 'PUT', {
        viewerAppClientId: clientId || null,
      })
      notify({ type: 'success', message: t('DICOM viewer app updated') })
    } catch (err) {
      notify({ type: 'error', message: err instanceof Error ? err.message : t('Failed to update viewer app') })
    } finally {
      setSavingViewerApp(false)
    }
  }

  const handleSetDefault = async (serverId: string) => {
    await clientApis.admin.putAdminDicomServersByServerId({ serverId, updateDicomServerRequest: { isDefault: true } })
    notify({ type: 'success', message: t('Default DICOM server updated') })
    await fetchServers()
  }

  const handleViewDetails = (serverId: string) => {
    const server = servers.find(s => s.id === serverId)
    if (server) {
      setSelectedServer(server)
      setActiveTab('details')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────

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

      {/* DICOM Viewer App Setting */}
      {smartApps.length > 0 && (
        <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-foreground">{t('DICOM Viewer App')}</h2>
              <p className="text-sm text-muted-foreground">{t('Choose a registered SMART app to use as the DICOM image viewer across the platform.')}</p>
            </div>
          </div>
          <div className="max-w-md">
            <Select value={viewerAppClientId || "__none__"} onValueChange={(v) => handleViewerAppChange(v === "__none__" ? "" : v)} disabled={savingViewerApp}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('None (use built-in viewer)')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('None (use built-in viewer)')}</SelectItem>
                {smartApps.filter(a => a.enabled && a.clientId).map(app => (
                  <SelectItem key={app.clientId} value={app.clientId!}>
                    {app.name || app.clientId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Main Content — Tabs */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ResponsiveTabsList columns={2}>
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
              {t('Server Overview')}
            </TabsTrigger>
            <TabsTrigger value="details" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
              {t('Server Details')}
            </TabsTrigger>
          </ResponsiveTabsList>

          <TabsContent value="overview" className="p-6 space-y-6">
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
              <DicomServerOverview
                servers={servers}
                onEdit={setEditingServer}
                onDelete={handleDelete}
                onProbeStatus={handleProbeStatus}
                onSetDefault={handleSetDefault}
                onViewDetails={handleViewDetails}
              />
            )}
          </TabsContent>

          <TabsContent value="details" className="p-6 space-y-6">
            {selectedServer ? (
              <DicomServerDetails server={selectedServer} />
            ) : (
              <div className="bg-card/70 backdrop-blur-sm p-12 rounded-2xl border border-border shadow-lg text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-muted/50 rounded-2xl flex items-center justify-center shadow-sm">
                  <Info className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{t('No Server Selected')}</h3>
                <p className="text-muted-foreground mb-6 font-medium">
                  {t('Select a server from the overview tab to view detailed information')}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AddDicomServerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAdd}
      />
      <EditDicomServerDialog
        key={editingServer?.id ?? 'new'}
        open={!!editingServer}
        onOpenChange={(open) => { if (!open) setEditingServer(null) }}
        server={editingServer}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
