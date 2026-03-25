import { ServerCard } from './ServerCard';
import type { FhirServerWithState } from '@/lib/types/api';

interface ServerOverviewProps {
  servers: FhirServerWithState[];
  securityChecks: Record<string, 'checking' | 'secure' | 'insecure'>;
  onViewDetails: (serverId: string) => void;
  onConfigureMtls: (server: FhirServerWithState) => void;
  onCheckSecurity: (server: FhirServerWithState) => void;
  onEditServer: (server: FhirServerWithState) => void;
  onDeleteServer: (server: FhirServerWithState) => void;
}

export function ServerOverview({
  servers,
  securityChecks,
  onViewDetails,
  onConfigureMtls,
  onCheckSecurity,
  onEditServer,
  onDeleteServer
}: ServerOverviewProps) {
  return (
    <div className="p-6 space-y-6">
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
          />
        ))}
      </div>
    </div>
  );
}
