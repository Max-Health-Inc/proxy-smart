import { ServerCard } from './ServerCard';
import { Database } from 'lucide-react';
import type { FhirServerWithState } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

interface ServerOverviewProps {
  servers: FhirServerWithState[];
  securityChecks: Record<string, 'checking' | 'secure' | 'insecure'>;
  onViewDetails: (serverId: string) => void;
  onConfigureMtls: (server: FhirServerWithState) => void;
  onCheckSecurity: (server: FhirServerWithState) => void;
  onEditServer: (server: FhirServerWithState) => void;
  onDeleteServer: (server: FhirServerWithState) => void;
  onAddServer?: () => void;
  onToggleStrictCapabilities?: (server: FhirServerWithState, strict: boolean) => void;
}

export function ServerOverview({
  servers,
  securityChecks,
  onViewDetails,
  onConfigureMtls,
  onCheckSecurity,
  onEditServer,
  onDeleteServer,
  onAddServer,
  onToggleStrictCapabilities
}: ServerOverviewProps) {
  const { t } = useTranslation();

  if (servers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="w-16 h-16 mx-auto mb-6 bg-muted/50 rounded-2xl flex items-center justify-center shadow-sm">
          <Database className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">{t('No FHIR servers configured')}</h3>
        <p className="text-muted-foreground mb-6 font-medium">
          {t('Add a FHIR server to manage connections and view metadata.')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {servers.map((server) => (
          <ServerCard
            key={server.id}
            server={server}
            securityStatus={securityChecks[server.id]}
            onViewDetails={onViewDetails}
            onConfigureMtls={onConfigureMtls}
            onCheckSecurity={onCheckSecurity}
            onEditServer={onEditServer}
            onDeleteServer={onDeleteServer}
            onToggleStrictCapabilities={onToggleStrictCapabilities}
          />
        ))}
      </div>
    </div>
  );
}
