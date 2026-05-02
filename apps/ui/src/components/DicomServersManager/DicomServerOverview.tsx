import { DicomServerCard } from './DicomServerCard'
import type { DicomServerWithStatus } from './DicomServersManager'

interface DicomServerOverviewProps {
  servers: DicomServerWithStatus[]
  onEdit: (server: DicomServerWithStatus) => void
  onDelete: (server: DicomServerWithStatus) => void
  onProbeStatus: (serverId: string) => void
  onSetDefault: (serverId: string) => void
  onViewDetails: (serverId: string) => void
}

export function DicomServerOverview({
  servers,
  onEdit,
  onDelete,
  onProbeStatus,
  onSetDefault,
  onViewDetails,
}: DicomServerOverviewProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
      {servers.map(server => (
        <DicomServerCard
          key={server.id}
          server={server}
          onEdit={() => onEdit(server)}
          onDelete={() => onDelete(server)}
          onProbeStatus={() => onProbeStatus(server.id)}
          onSetDefault={() => onSetDefault(server.id)}
          onViewDetails={() => onViewDetails(server.id)}
        />
      ))}
    </div>
  )
}
