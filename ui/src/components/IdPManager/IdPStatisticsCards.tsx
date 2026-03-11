import { Server, Shield, Globe, Key } from 'lucide-react';
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
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Server className="w-6 h-6 text-primary" />
              </div>
              <div className="text-sm font-semibold text-blue-800 dark:text-blue-300 tracking-wide">Total IdPs</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">{idps.length}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="text-sm font-semibold text-green-800 dark:text-green-300 tracking-wide">Active</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {totalActive}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div className="text-sm font-semibold text-purple-800 dark:text-purple-300 tracking-wide">Total Users</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {totalUsers}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <div className="text-sm font-semibold text-orange-800 dark:text-orange-300 tracking-wide">SAML Providers</div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {totalSaml}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
