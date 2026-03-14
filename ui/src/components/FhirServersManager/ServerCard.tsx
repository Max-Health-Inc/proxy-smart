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
  Loader2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import type { FhirServerWithState } from '@/lib/types/api';

interface ServerCardProps {
  server: FhirServerWithState;
  securityStatus?: 'checking' | 'secure' | 'insecure';
  onViewDetails: (serverId: string) => void;
  onConfigureMtls: (server: FhirServerWithState) => void;
  onCheckSecurity: (server: FhirServerWithState) => void;
  onEditServer: (server: FhirServerWithState) => void;
}

export function ServerCard({
  server,
  securityStatus,
  onViewDetails,
  onConfigureMtls,
  onCheckSecurity,
  onEditServer
}: ServerCardProps) {
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
              <p className="text-xs text-destructive font-medium">Unable to connect to server</p>
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
              <><Check className="w-3 h-3 mr-1" /> Supported</>
            ) : (
              <><X className="w-3 h-3 mr-1" /> Unsupported</>
            )}
          </Badge>
          
          {/* Security Status Badge */}
          {securityStatus === 'insecure' && (
            <Badge 
              variant="destructive" 
              className="bg-orange-500/10 dark:bg-orange-400/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-400/30 shadow-sm"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Security Warning
            </Badge>
          )}
          {securityStatus === 'secure' && (
            <Badge 
              variant="default" 
              className="bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30 shadow-sm"
            >
              <Check className="w-3 h-3 mr-1" />
              Secure
            </Badge>
          )}
          {securityStatus === 'checking' && (
            <Badge 
              variant="secondary" 
              className="bg-primary/10 text-primary border-primary/30 shadow-sm"
            >
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Checking...
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 p-3 rounded-xl">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">FHIR Version</span>
            <p className="text-sm font-bold text-foreground mt-1">{server.fhirVersion}</p>
          </div>
          <div className="bg-muted/50 p-3 rounded-xl">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Server Software</span>
            <p className="text-sm font-bold text-foreground mt-1">{server.serverName || 'Unknown'}</p>
          </div>
        </div>

        <div className="space-y-3">
          {server.connectionStatus === 'connected' && server.endpoints?.base && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Proxy URL:
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
            <span className="text-xs font-medium text-muted-foreground">Origin URL:</span>
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
              <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">Security Warning</span>
            </div>
            <div className="text-xs text-orange-700 dark:text-orange-300 space-y-2">
              <p>
                This FHIR server is publicly accessible and can be reached directly, bypassing the secure proxy.
                It should only accept traffic from the Proxy Server.
              </p>
              <ul className="list-disc pl-5">
                <li>TLS everywhere: secure client-to-proxy and proxy-to-FHIR connections.</li>
                <li>Lock down the FHIR server to only accept proxy IPs via a private subnet or VPN—avoid relying solely on public-IP ACLs.</li>
                <li>Consider mutual TLS (mTLS) between proxy and FHIR server for extra assurance.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Launch Context Summary */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground">Launch Contexts:</span>
            <span className="text-xs text-muted-foreground">3 available</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-400/20">
              Global
            </Badge>
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
              Patient Chart
            </Badge>
            <Badge variant="secondary" className="text-xs bg-violet-500/10 dark:bg-violet-400/20 text-violet-700 dark:text-violet-300 border-violet-500/20 dark:border-violet-400/20">
              Provider Context
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(server.id)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border-border hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Eye className="w-3 h-3" />
            <span>View Details</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfigureMtls(server)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Shield className="w-3 h-3" />
            <span>Configure mTLS</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCheckSecurity(server)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Check Security</span>
          </Button>
          {server.connectionStatus === 'disconnected' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditServer(server)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-500/10 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Edit className="w-3 h-3" />
              <span>Fix URL</span>
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
              <span>Metadata</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
