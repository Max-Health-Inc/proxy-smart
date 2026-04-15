import { Building2, CheckCircle2, XCircle, Users } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { GetAdminOrganizations200ResponseInner } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';

interface OrgStatisticsCardsProps {
  orgs: GetAdminOrganizations200ResponseInner[];
}

export function OrgStatisticsCards({ orgs }: OrgStatisticsCardsProps) {
  const { t } = useTranslation();
  const totalEnabled = orgs.filter((o) => o.enabled !== false).length;
  const totalDisabled = orgs.filter((o) => o.enabled === false).length;
  const totalDomains = orgs.reduce((acc, o) => acc + (o.domains?.length ?? 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard icon={Building2} label={t('Total')} value={orgs.length} color="blue" />
      <StatCard icon={CheckCircle2} label={t('Enabled')} value={totalEnabled} color="green" />
      <StatCard icon={XCircle} label={t('Disabled')} value={totalDisabled} color="red" />
      <StatCard icon={Users} label={t('Domains')} value={totalDomains} color="purple" />
    </div>
  );
}
