// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { Database, Server, Shield } from 'lucide-react';
import { StatCard } from '@proxy-smart/shared-ui';
import { useTranslation } from 'react-i18next';
import type { FederationWithStatus } from './types';

export function FederationStatisticsCards({ federations }: { federations: FederationWithStatus[] }) {
  const { t } = useTranslation();
  const active = federations.filter(f => f.status === 'active').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard icon={Database} label={t('Total Federations')} value={federations.length} color="blue" />
      <StatCard icon={Shield} label={t('Active')} value={active} color="green" />
      <StatCard icon={Server} label={t('Inactive')} value={federations.length - active} color="orange" />
    </div>
  );
}
