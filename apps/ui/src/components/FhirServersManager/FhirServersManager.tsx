import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  Plus,
  Info
} from 'lucide-react';
import { Button, Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@max-health-inc/shared-ui';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { PageErrorState } from '@/components/ui/page-error-state';
import { useAuth } from '@/stores/authStore';
import { useAlertStore } from '@/stores/alertStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { 
  FhirServerWithState
} from '@/lib/types/api';
import type { MtlsConfig } from './types';

// Imported extracted components
import { StatsCards } from './StatsCards';
import { ServerOverview } from './ServerOverview';
import { ServerDetails } from './ServerDetails';
import { AddServerDialog } from './AddServerDialog';
import { EditServerDialog } from './EditServerDialog';
import { MtlsConfigDialog } from './MtlsConfigDialog';
import { useTranslation } from 'react-i18next';

export function FhirServersManager() {
  const { t } = useTranslation();
  const { clientApis } = useAuth();
  const { confirm } = useAlertStore();
  const { notify } = useNotificationStore();
  const [servers, setServers] = useState<FhirServerWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<FhirServerWithState | null>(null);
  const [loadingServerDetail, setLoadingServerDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Add Server Dialog State
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Edit Server Dialog State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<FhirServerWithState | null>(null);

  // Security check state
  const [securityChecks, setSecurityChecks] = useState<Record<string, 'checking' | 'secure' | 'insecure'>>({});

  // mTLS Configuration state
  const [showMtlsDialog, setShowMtlsDialog] = useState(false);
  const [selectedServerForMtls, setSelectedServerForMtls] = useState<FhirServerWithState | null>(null);
  const [mtlsConfig, setMtlsConfig] = useState<Record<string, MtlsConfig>>({});
  const [uploadingCerts, setUploadingCerts] = useState(false);

  const checkServerSecurity = useCallback(async (server: FhirServerWithState) => {
    // Skip check for URLs unreachable from the browser:
    // - http:// origins on an https:// page (mixed content blocked)
    // - Private/internal hostnames (not resolvable from public internet)
    try {
      const origin = new URL(server.url);
      const isPageSecure = window.location.protocol === 'https:';
      const isOriginInsecure = origin.protocol === 'http:';
      const isPrivateHost = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|.*\.internal$|.*\.local$)/i.test(origin.hostname)
        || !origin.hostname.includes('.');  // single-label hostnames like "hapi-fhir"
      if ((isPageSecure && isOriginInsecure) || isPrivateHost) {
        setSecurityChecks(prev => ({ ...prev, [server.id]: 'secure' }));
        return;
      }
    } catch {
      setSecurityChecks(prev => ({ ...prev, [server.id]: 'secure' }));
      return;
    }

    setSecurityChecks(prev => {
      if (prev[server.id]) {
        return prev;
      }
      
      setTimeout(async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${server.url}/metadata`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          if (response.type === 'opaque') {
            setSecurityChecks(prevChecks => ({ ...prevChecks, [server.id]: 'insecure' }));
          } else {
            setSecurityChecks(prevChecks => ({ ...prevChecks, [server.id]: 'secure' }));
          }
        } catch {
          setSecurityChecks(prevChecks => ({ ...prevChecks, [server.id]: 'secure' }));
        }
      }, 0);
      
      return { ...prev, [server.id]: 'checking' };
    });
  }, []);

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clientApis.servers.getFhirServers();
      
      const mappedServers: FhirServerWithState[] = response.servers.map((server) => ({
        ...server,
        connectionStatus: server.fhirVersion === 'Unknown' ? 'disconnected' : 'connected',
        loading: false,
        error: undefined
      }));
      
      setServers(mappedServers);

      setSecurityChecks(prevChecks => {
        const updatedChecks = { ...prevChecks };
        
        mappedServers.forEach((server) => {
          if (server.connectionStatus === 'disconnected') {
            delete updatedChecks[server.id];
          } else {
            checkServerSecurity(server);
          }
        });
        
        return updatedChecks;
      });
    } catch (err) {
      setError(t('Failed to load FHIR servers'));
      console.error('Error fetching servers:', err);
    } finally {
      setLoading(false);
    }
  }, [clientApis, checkServerSecurity]);

  const handleAddServer = async (url: string) => {
    const existingServer = servers.find(server => server.url === url);
    if (existingServer) {
      setUrlError(`This URL is already registered for server "${existingServer.serverName || existingServer.name}"`);
      return;
    }

    try {
      setError(null);
      setUrlError(null);
      
      await clientApis.servers.postFhirServers({
        addFhirServerRequest: {
          url: url
        }
      });

      setShowAddDialog(false);
      notify({ type: 'success', message: t('FHIR server added') });
      await fetchServers();
    } catch (err: unknown) {
      console.error('Failed to add FHIR server:', err);
      
      const error = err as { response?: { status?: number }; message?: string };
      
      if (error?.response?.status === 409 || error?.message?.includes('duplicate') || error?.message?.includes('already exists')) {
        setUrlError(t('This URL is already registered'));
      } else if (error?.response?.status === 400) {
        setUrlError(t('Invalid server URL or server not accessible'));
      } else {
        setError(t('Failed to add FHIR server. Please check if the server is accessible and supports FHIR.'));
      }
    }
  };

  const handleEditServer = (server: FhirServerWithState) => {
    setEditingServer(server);
    setShowEditDialog(true);
  };

  const handleUpdateServer = async (server: FhirServerWithState, newUrl: string) => {
    const existingServer = servers.find(s => 
      s.url === newUrl && s.id !== server.id
    );
    
    if (existingServer) {
      setUrlError(`This URL is already registered for server "${existingServer.serverName || existingServer.name}"`);
      return;
    }

    if (newUrl === server.url) {
      setShowEditDialog(false);
      setEditingServer(null);
      return;
    }

    try {
      setError(null);
      setUrlError(null);
      
      await clientApis.servers.putFhirServersByServerId({
        serverId: server.id,
        addFhirServerRequest: {
          url: newUrl
        }
      });

      setShowEditDialog(false);
      setEditingServer(null);
      notify({ type: 'success', message: t('FHIR server updated') });
      await fetchServers();
    } catch (err: unknown) {
      console.error('Failed to update FHIR server:', err);
      
      const error = err as { response?: { status?: number }; message?: string };
      
      if (error?.response?.status === 409 || error?.message?.includes('duplicate') || error?.message?.includes('already exists')) {
        setUrlError(t('This URL is already registered'));
      } else if (error?.response?.status === 400) {
        setUrlError(t('Invalid server URL or server not accessible'));
      } else {
        setError(t('Failed to update FHIR server. Please check if the server is accessible and supports FHIR.'));
      }
    }
  };

  const fetchServerDetail = useCallback(async (serverId: string) => {
    try {
      setLoadingServerDetail(true);
      const response = await clientApis.servers.getFhirServersByServerId({ serverId });
      setSelectedServer({id: serverId, ...response});
      setActiveTab('details');
    } catch (err) {
      console.error('Error fetching server detail:', err);
      setSelectedServer(null);
    } finally {
      setLoadingServerDetail(false);
    }
  }, [clientApis]);

  const handleConfigureMtls = (server: FhirServerWithState) => {
    setSelectedServerForMtls(server);
    setShowMtlsDialog(true);
  };

  const handleMtlsConfigChange = (serverId: string, config: MtlsConfig) => {
    setMtlsConfig(prev => ({
      ...prev,
      [serverId]: config
    }));
  };

  const handleCertificateUpload = async (serverId: string, certType: 'client' | 'key' | 'ca', file: File) => {
    try {
      setUploadingCerts(true);
      
      setMtlsConfig(prev => ({
        ...prev,
        [serverId]: {
          ...prev[serverId],
          [`${certType}${certType === 'client' ? 'Cert' : certType === 'key' ? 'Key' : 'Cert'}`]: file
        }
      }));

      if (certType === 'client') {
        setMtlsConfig(prev => ({
          ...prev,
          [serverId]: {
            ...prev[serverId],
            certDetails: {
              subject: 'CN=proxy-client, O=MyOrg',
              issuer: 'CN=MyOrg Test CA',
              validFrom: new Date().toISOString(),
              validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              fingerprint: 'SHA256:' + Math.random().toString(36).substring(7)
            }
          }
        }));
      }
    } catch (error) {
      console.error('Failed to upload certificate:', error);
    } finally {
      setUploadingCerts(false);
    }
  };

  const handleCheckSecurity = (server: FhirServerWithState) => {
    setSecurityChecks(prev => {
      const newChecks = { ...prev };
      delete newChecks[server.id];
      return newChecks;
    });
    checkServerSecurity(server);
  };

  const handleDeleteServer = (server: FhirServerWithState) => {
    const isDisconnected = server.connectionStatus === 'disconnected';
    confirm({
      title: t('Delete Server'),
      message: isDisconnected
        ? t('This server is unreachable and can be safely removed. Delete "{{name}}"?', { name: server.serverName || server.name })
        : t('Are you sure you want to delete "{{name}}"? Any SMART apps or launch contexts referencing this server will lose their FHIR connection. This action cannot be undone.', { name: server.serverName || server.name }),
      type: isDisconnected ? 'warning' : 'error',
      confirmText: t('Delete Server'),
      cancelText: t('Cancel'),
      onConfirm: async () => {
        try {
          await clientApis.servers.deleteFhirServersByServerId({ serverId: server.id });
          notify({ type: 'success', message: t('FHIR server deleted') });
          if (selectedServer?.id === server.id) setSelectedServer(null);
          await fetchServers();
        } catch (err) {
          notify({ type: 'error', message: err instanceof Error ? err.message : t('Delete failed') });
        }
      },
    });
  };

  const handleToggleStrictCapabilities = useCallback(async (server: FhirServerWithState, strict: boolean) => {
    try {
      await clientApis.servers.patchFhirServersByServerIdStrictCapabilities({
        serverId: server.id,
        setStrictCapabilitiesRequest: { strict }
      });
      // Optimistic update
      setServers(prev => prev.map(s =>
        s.id === server.id ? { ...s, strictCapabilities: strict } : s
      ));
    } catch (err) {
      console.error('Failed to toggle strict capabilities:', err);
      setError(t('Failed to update strict capabilities setting'));
    }
  }, [clientApis]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  if (loading) {
    return <PageLoadingState message={t('Loading FHIR Servers...')} />;
  }

  if (error) {
    return (
      <PageErrorState
        title={t('Error Loading Servers')}
        message={error}
        onRetry={fetchServers}
        retryLabel={t('Retry')}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      {/* Enhanced Header */}
      <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
              {t('FHIR Server Management')}
            </h1>
            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Database className="w-5 h-5 text-primary" />
              </div>
              {t('Manage and monitor FHIR server connections')}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('Add Server')}
            </Button>
            <Button
              variant="outline"
              onClick={fetchServers}
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              {t('Refresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards servers={servers} />

      {/* Main Content */}
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
            <ServerOverview
              servers={servers}
              securityChecks={securityChecks}
              onViewDetails={fetchServerDetail}
              onConfigureMtls={handleConfigureMtls}
              onCheckSecurity={handleCheckSecurity}
              onEditServer={handleEditServer}
              onDeleteServer={handleDeleteServer}
              onToggleStrictCapabilities={handleToggleStrictCapabilities}
            />
          </TabsContent>

          <TabsContent value="details" className="p-6 space-y-6">
            {selectedServer ? (
              <ServerDetails server={selectedServer} />
            ) : (
              <div className="bg-card/70 backdrop-blur-sm p-12 rounded-2xl border border-border shadow-lg text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-muted/50 rounded-2xl flex items-center justify-center shadow-sm">
                  <Info className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{t('No Server Selected')}</h3>
                <p className="text-muted-foreground mb-6 font-medium">
                  {t('Select a server from the overview tab to view detailed information')}
                </p>
                {loadingServerDetail && (
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Components */}
      <AddServerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddServer={handleAddServer}
        urlError={urlError}
      />

      <EditServerDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        server={editingServer}
        onUpdateServer={handleUpdateServer}
        urlError={urlError}
      />

      <MtlsConfigDialog
        open={showMtlsDialog}
        onOpenChange={setShowMtlsDialog}
        server={selectedServerForMtls}
        config={mtlsConfig}
        onConfigChange={handleMtlsConfigChange}
        onCertificateUpload={handleCertificateUpload}
        uploadingCerts={uploadingCerts}
      />
    </div>
  );
}