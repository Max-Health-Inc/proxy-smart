import { Activity, Shield, Settings } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { SmartApp } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

interface SmartAppsStatisticsProps {
  apps: SmartApp[];
}

export function SmartAppsStatistics({ apps }: SmartAppsStatisticsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <StatCard icon={Activity} label={t('Total Apps')} value={apps.length} color="blue" />
      <StatCard icon={Shield} label={t('EHR Launch')} value={apps.filter(app => app.appType === 'ehr-launch').length} color="emerald" />
      <StatCard icon={Activity} label={t('Standalone')} value={apps.filter(app => app.appType === 'standalone-app').length} color="blue" />
      <StatCard icon={Settings} label={t('Backend Service')} value={apps.filter(app => app.appType === 'backend-service').length} color="orange" />
      <StatCard icon={Activity} label={t('AI Agents')} value={apps.filter(app => app.appType === 'agent').length} color="violet" iconElement={<span className="text-sm">🤖</span>} />
    </div>
  );
}
