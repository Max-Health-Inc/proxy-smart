import { Users, UserCheck, UserX, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '@/components/ui/stat-card';

interface BaseUser {
  enabled: boolean;
  createdAt?: string;
  createdTimestamp?: number;
}

interface HealthcareUsersStatsProps {
  users: BaseUser[];
}

export function HealthcareUsersStats({ users }: HealthcareUsersStatsProps) {
  const { t } = useTranslation();
  const activeUsers = users.filter(user => user.enabled).length;
  const inactiveUsers = users.filter(user => !user.enabled).length;
  const recentUsers = users.filter(user => {
    const createdDate = user.createdAt ? new Date(user.createdAt) :
      user.createdTimestamp ? new Date(user.createdTimestamp) : null;
    if (!createdDate) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdDate > weekAgo;
  }).length;

  const activePercent = users.length > 0 ? Math.round((activeUsers / users.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard icon={Users} label={t('Total Users')} value={users.length} color="primary" />
      <StatCard icon={UserCheck} label={t('Active')} value={activeUsers} subtitle={`${activePercent}% of total`} color="emerald" />
      <StatCard icon={UserX} label={t('Inactive')} value={inactiveUsers} color="red" />
      <StatCard icon={Clock} label={t('Recent')} value={recentUsers} subtitle={t('Added this week')} color="violet" />
    </div>
  );
}
