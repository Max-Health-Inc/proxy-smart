import { Activity, Shield, Settings } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { SmartApp } from '@/lib/types/api';

interface SmartAppsStatisticsProps {
  apps: SmartApp[];
}

export function SmartAppsStatistics({ apps }: SmartAppsStatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      <StatCard icon={Activity} label="Total Apps" value={apps.length} color="blue" />
      <StatCard icon={Shield} label="EHR Launch" value={apps.filter(app => app.appType === 'ehr-launch').length} color="emerald" />
      <StatCard icon={Activity} label="Standalone" value={apps.filter(app => app.appType === 'standalone-app').length} color="blue" />
      <StatCard icon={Settings} label="Backend Service" value={apps.filter(app => app.appType === 'backend-service').length} color="orange" />
      <StatCard icon={Activity} label="AI Agents" value={apps.filter(app => app.appType === 'agent').length} color="violet" iconElement={<span className="text-xl">🤖</span>} />
    </div>
  );
}
