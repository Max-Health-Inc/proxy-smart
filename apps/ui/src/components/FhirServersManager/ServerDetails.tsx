import {
  Server,
  Check,
  X,
  ExternalLink,
  AlertTriangle,
  Info,
  Database,
  Lock
} from 'lucide-react';
import { Badge, Button } from '@proxy-smart/shared-ui';
import { CopyButton } from '@/components/ui/copy-button';
import type { FhirServerDetails } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

export function ServerDetails({ server }: { server: FhirServerDetails }) {
  const { t } = useTranslation();

  return (
    <div className="bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm">
            <Server className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">{server.serverName || server.name}</h2>
            <p className="text-muted-foreground font-medium">{server.name}</p>
          </div>
        </div>
        <Badge
          variant={server.supported ? "default" : "destructive"}
          className={server.supported
            ? "bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30 shadow-sm px-4 py-2"
            : "bg-destructive/10 text-destructive border-destructive/30 shadow-sm px-4 py-2"
          }
        >
          {server.supported ? (
            <><Check className="w-4 h-4 mr-2" /> {t('Supported')}</>
          ) : (
            <><X className="w-4 h-4 mr-2" /> {t('Unsupported')}</>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                <span className={`text-sm font-bold ${(server.serverName === 'Unknown FHIR Server' || !server.serverName) ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {server.serverName || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-sm font-semibold text-muted-foreground">{t('FHIR Version:')}</span>
                <span className={`text-sm font-bold ${server.fhirVersion === 'Unknown' ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {server.fhirVersion}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-sm font-semibold text-muted-foreground">{t('Server Version:')}</span>
                <span className={`text-sm font-bold ${(!server.serverVersion || server.serverVersion === 'Unknown') ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {server.serverVersion || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-lg flex items-center justify-center mr-3">
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              {t('Connection')}
            </h3>
            <div className="space-y-3">
              {server.endpoints?.base && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      {t('Proxy URL:')}
                    </span>
                    <CopyButton value={server.endpoints?.base || ''} variant="icon-sm" />
                  </div>
                  <a
                    href={server.endpoints.base}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-foreground bg-emerald-500/5 dark:bg-emerald-400/5 p-3 rounded-xl font-mono break-all border border-emerald-500/20 dark:border-emerald-400/20 hover:bg-emerald-500/10 transition-colors"
                  >
                    {server.endpoints.base}
                  </a>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{t('Origin URL:')}</span>
                <CopyButton value={server.url || ''} variant="icon-xs" />
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg font-mono break-all border border-border/30">
                {server.url}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Endpoints - only show for servers without connection errors */}
      {server.fhirVersion !== 'Unknown' && server.supported && server.endpoints && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-foreground mb-6 flex items-center">
            <div className="w-8 h-8 bg-purple-500/10 dark:bg-purple-400/20 rounded-lg flex items-center justify-center mr-3">
              <ExternalLink className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            {t('API Endpoints')}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(server.endpoints).map(([key, url]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50 hover:bg-muted/70 transition-all duration-200">
                <div className="flex-1">
                  <p className="font-semibold text-foreground capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
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

      {/* Connection Error Message for servers with issues */}
      {(server.fhirVersion === 'Unknown' || !server.supported) && (
        <div className="mt-8">
          <div className="bg-destructive/10 p-6 rounded-xl border border-destructive/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h4 className="font-semibold text-destructive">{t('Connection Error')}</h4>
                <p className="text-destructive/80 text-sm">{t('Unable to connect to this FHIR server or retrieve metadata')}</p>
              </div>
            </div>
            <p className="text-destructive/70 text-sm">
              {t('This server cannot be reached or does not respond with valid FHIR metadata. API endpoints and advanced features are not available for this server.')}
            </p>
          </div>
        </div>
      )}

      {/* SMART Capabilities */}
      {server.smartCapabilities && server.smartCapabilities.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-foreground mb-6 flex items-center">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
              <Database className="w-4 h-4 text-primary" />
            </div>
            {t('SMART Capabilities')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {server.smartCapabilities.map((cap) => (
              <Badge
                key={cap}
                variant="secondary"
                className="text-xs px-3 py-1.5 bg-primary/10 text-primary border-primary/20"
              >
                {cap}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}