import { Server, Check, X, Play } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { FhirServerWithState } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

interface StatsCardsProps {
  servers: FhirServerWithState[];
}

export function StatsCards({ servers }: StatsCardsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard icon={Server} label={t('Total Servers')} value={servers.length} color="primary" />
      <StatCard icon={Check} label={t('Supported Servers')} value={servers.filter(s => s.supported).length} color="emerald" />
      <StatCard icon={X} label={t('Unsupported Servers')} value={servers.filter(s => !s.supported).length} color="red" />
      <StatCard icon={Play} label={t('Launch Contexts')} value={12} subtitle={t('Available contexts')} color="violet" />
    </div>
  );
}
