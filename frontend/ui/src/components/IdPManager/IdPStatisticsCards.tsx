import { Server, Shield, Globe, Key } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { IdentityProviderWithStats } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

interface IdPStatisticsCardsProps {
  idps: IdentityProviderWithStats[];
}

export function IdPStatisticsCards({ idps }: IdPStatisticsCardsProps) {
  const { t } = useTranslation();
  const totalActive = idps.filter((idp) => (idp.status ?? (idp.enabled ? 'active' : 'inactive')) === 'active').length;
  const totalUsers = idps.reduce((acc, idp) => acc + (idp.userCount ?? 0), 0);
  const totalSaml = idps.filter((idp) => (idp.providerId ?? '').toLowerCase() === 'saml').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard icon={Server} label={t('Total IdPs')} value={idps.length} color="blue" />
      <StatCard icon={Shield} label={t('Active')} value={totalActive} color="green" />
      <StatCard icon={Globe} label={t('Total Users')} value={totalUsers} color="purple" />
      <StatCard icon={Key} label={t('SAML Providers')} value={totalSaml} color="orange" />
    </div>
  );
}
