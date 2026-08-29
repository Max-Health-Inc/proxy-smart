// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { Server, Shield, Globe, Key, Shuffle } from 'lucide-react';
import { StatCard } from '@proxy-smart/shared-ui';
import type { IdentityProviderWithStats } from '@/lib/types/api';
import type { IdentityProviderMapperStatus } from '@max-health-inc/proxy-smart-client';
import { useTranslation } from 'react-i18next';

interface IdPStatisticsCardsProps {
  idps: IdentityProviderWithStats[];
  /** Claim-mapping health per provider alias */
  mapperStatus?: Record<string, IdentityProviderMapperStatus>;
}

export function IdPStatisticsCards({ idps, mapperStatus = {} }: IdPStatisticsCardsProps) {
  const { t } = useTranslation();
  const totalActive = idps.filter((idp) => (idp.status ?? (idp.enabled ? 'active' : 'inactive')) === 'active').length;
  const totalUsers = idps.reduce((acc, idp) => acc + (idp.userCount ?? 0), 0);
  const totalSaml = idps.filter((idp) => (idp.providerId ?? '').toLowerCase() === 'saml').length;

  // Providers humans log in through that can carry attribute mappers, and how
  // many of those import everything a SMART launch needs. Machine trust anchors
  // (client-assertion federation) are excluded — they would never be "ready".
  const mappable = Object.values(mapperStatus).filter(
    (status) => status.userFacing && !status.unsupported,
  );
  const mapped = mappable.filter((status) => status.healthy).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-6">
      <StatCard icon={Server} label={t('Total IdPs')} value={idps.length} color="blue" />
      <StatCard icon={Shield} label={t('Active')} value={totalActive} color="green" />
      <StatCard icon={Globe} label={t('Total Users')} value={totalUsers} color="purple" />
      <StatCard icon={Key} label={t('SAML Providers')} value={totalSaml} color="orange" />
      <StatCard
        icon={Shuffle}
        label={t('Claim Mapping Ready')}
        value={mappable.length > 0 ? `${mapped}/${mappable.length}` : '—'}
        color={mappable.length > 0 && mapped < mappable.length ? 'red' : 'green'}
      />
    </div>
  );
}
