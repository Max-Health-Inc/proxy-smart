import {
  Server,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Eye,
  Edit,
  Shield,
  ShieldCheck,
  Loader2,
  Lock,
  Trash2
} from 'lucide-react';
import { Badge, Button, Label } from '@max-health-inc/shared-ui';
import { Switch } from '@/components/ui/switch';
import { CopyButton } from '@/components/ui/copy-button';
import type { FhirServerWithState } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

interface ServerCardProps {
  server: FhirServerWithState;
  securityStatus?: 'checking' | 'secure' | 'insecure';
  onViewDetails: (serverId: string) => void;
  onConfigureMtls: (server: FhirServerWithState) => void;
  onCheckSecurity: (server: FhirServerWithState) => void;
  onEditServer: (server: FhirServerWithState) => void;
  onDeleteServer: (server: FhirServerWithState) => void;
  onToggleStrictCapabilities?: (server: FhirServerWithState, strict: boolean) => void;
}

export function ServerCard({
  server,
  securityStatus,
  onViewDetails,
  onConfigureMtls,
  onCheckSecurity,
  onEditServer,
  onDeleteServer,
  onToggleStrictCapabilities
}: ServerCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
            server.connectionStatus === 'disconnected'
              ? 'bg-destructive/10' 
              : 'bg-primary/10'
          }`}>
            {server.connectionStatus === 'disconnected' ? (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            ) : (
              <Server className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-foreground tracking-tight">{server.serverName || server.name}</h3>
              {server.connectionStatus === 'disconnected' && (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground font-medium">{server.name}</p>
            {server.connectionStatus === 'disconnected' && (
              <p className="text-xs text-destructive font-medium">{t('Unable to connect to server')}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant={server.supported ? "default" : "destructive"}
            className={server.supported
              ? "bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30 shadow-sm"
              : "bg-destructive/10 text-destructive border-destructive/30 shadow-sm"
            }
          >
            {server.supported ? (
              <><Check className="w-3 h-3 mr-1" /> {t('Supported')}</>
            ) : (
              <><X className="w-3 h-3 mr-1" /> {t('Unsupported')}</>
            )}
          </Badge>
          
          {/* Security Status Badge */}
          {securityStatus === 'insecure' && (
            <Badge 
              variant="destructive" 
              className="bg-orange-500/10 dark:bg-orange-400/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-400/30 shadow-sm"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              {t('Security Warning')}
            </Badge>
          )}
          {securityStatus === 'secure' && (
            <Badge 
              variant="default" 
              className="bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30 shadow-sm"
            >
              <Check className="w-3 h-3 mr-1" />
              {t('Secure')}
            </Badge>
          )}
          {securityStatus === 'checking' && (
            <Badge 
              variant="secondary" 
              className="bg-primary/10 text-primary border-primary/30 shadow-sm"
            >
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {t('Checking...')}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 p-3 rounded-xl">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('FHIR Version')}</span>
            <p className="text-sm font-bold text-foreground mt-1">{server.fhirVersion}</p>
          </div>
          <div className="bg-muted/50 p-3 rounded-xl">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Server Software')}</span>
            <p className="text-sm font-bold text-foreground mt-1">{server.serverName || 'Unknown'}</p>
          </div>
        </div>

        <div className="space-y-3">
          {server.connectionStatus === 'connected' && server.endpoints?.base && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {t('Proxy URL:')}
                </span>
                <CopyButton value={server.endpoints.base} variant="icon-sm" />
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
            <CopyButton value={server.url} variant="icon-xs" />
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg font-mono break-all border border-border/30">
            {server.url}
          </p>
        </div>

        {/* Security Warning - only show for servers without connection errors */}
        {server.connectionStatus === 'connected' && securityStatus === 'insecure' && (
          <div className="bg-orange-500/10 dark:bg-orange-400/10 p-3 rounded-xl border border-orange-500/20 dark:border-orange-400/20">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">{t('Security Warning')}</span>
            </div>
            <div className="text-xs text-orange-700 dark:text-orange-300 space-y-2">
              <p>
                {t('This FHIR server is publicly accessible and can be reached directly, bypassing the secure proxy. It should only accept traffic from the Proxy Server.')}
              </p>
              <ul className="list-disc pl-5">
                <li>{t('TLS everywhere: secure client-to-proxy and proxy-to-FHIR connections.')}</li>
                <li>{t('Lock down the FHIR server to only accept proxy IPs via a private subnet or VPN—avoid relying solely on public-IP ACLs.')}</li>
                <li>{t('Consider mutual TLS (mTLS) between proxy and FHIR server for extra assurance.')}</li>
              </ul>
            </div>
          </div>
        )}

        {/* Strict Capabilities Toggle */}
        {server.connectionStatus === 'connected' && (
          <div className="flex items-center justify-between bg-muted/50 p-3 rounded-xl border border-border/30">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <div>
                <Label htmlFor={`strict-cap-${server.id}`} className="text-sm font-semibold cursor-pointer">
                  {t('Strict Capabilities')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('Reject requests for unsupported FHIR interactions')}
                </p>
              </div>
            </div>
            <Switch
              id={`strict-cap-${server.id}`}
              checked={server.strictCapabilities ?? false}
              onCheckedChange={(checked) => onToggleStrictCapabilities?.(server, checked)}
            />
          </div>
        )}

        {/* SMART Capabilities */}
        {server.smartCapabilities && server.smartCapabilities.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground">{t('SMART Capabilities:')}</span>
              <span className="text-xs text-muted-foreground">{server.smartCapabilities.length} {t('available')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {server.smartCapabilities.slice(0, 5).map((cap) => (
                <Badge key={cap} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {cap}
                </Badge>
              ))}
              {server.smartCapabilities.length > 5 && (
                <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground border-border/50">
                  +{server.smartCapabilities.length - 5} {t('more')}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(server.id)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border-border hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Eye className="w-3 h-3" />
            <span>{t('View Details')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfigureMtls(server)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Shield className="w-3 h-3" />
            <span>{t('Configure mTLS')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCheckSecurity(server)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{t('Check Security')}</span>
          </Button>
          {server.connectionStatus === 'disconnected' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditServer(server)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-500/10 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Edit className="w-3 h-3" />
              <span>{t('Fix URL')}</span>
            </Button>
          )}
          {server.connectionStatus === 'connected' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(server.endpoints.metadata, '_blank')}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl border-border hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{t('Metadata')}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteServer(server)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Trash2 className="w-3 h-3" />
            <span>{t('Delete')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}