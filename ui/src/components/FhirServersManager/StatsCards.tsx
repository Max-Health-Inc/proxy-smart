import { Server, Check, X, Play } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { FhirServerWithState } from '@/lib/types/api';

interface StatsCardsProps {
  servers: FhirServerWithState[];
}

export function StatsCards({ servers }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard icon={Server} label="Total Servers" value={servers.length} color="primary" />
      <StatCard icon={Check} label="Supported Servers" value={servers.filter(s => s.supported).length} color="emerald" />
      <StatCard icon={X} label="Unsupported Servers" value={servers.filter(s => !s.supported).length} color="red" />
      <StatCard icon={Play} label="Launch Contexts" value={12} subtitle="Available contexts" color="violet" />
    </div>
  );
}
