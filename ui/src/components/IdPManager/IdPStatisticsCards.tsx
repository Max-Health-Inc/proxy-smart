import { Server, Shield, Globe, Key } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { IdentityProviderWithStats } from '@/lib/types/api';

interface IdPStatisticsCardsProps {
  idps: IdentityProviderWithStats[];
}

export function IdPStatisticsCards({ idps }: IdPStatisticsCardsProps) {
  const totalActive = idps.filter((idp) => (idp.status ?? (idp.enabled ? 'active' : 'inactive')) === 'active').length;
  const totalUsers = idps.reduce((acc, idp) => acc + (idp.userCount ?? 0), 0);
  const totalSaml = idps.filter((idp) => (idp.providerId ?? '').toLowerCase() === 'saml').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard icon={Server} label="Total IdPs" value={idps.length} color="blue" />
      <StatCard icon={Shield} label="Active" value={totalActive} color="green" />
      <StatCard icon={Globe} label="Total Users" value={totalUsers} color="purple" />
      <StatCard icon={Key} label="SAML Providers" value={totalSaml} color="orange" />
    </div>
  );
}
