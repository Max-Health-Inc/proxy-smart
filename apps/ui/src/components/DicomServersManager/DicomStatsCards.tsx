import { HardDrive, Check, X } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import type { DicomServerWithStatus } from './DicomServersManager'
import { useTranslation } from 'react-i18next'

interface DicomStatsCardsProps {
  servers: DicomServerWithStatus[]
}

export function DicomStatsCards({ servers }: DicomStatsCardsProps) {
  const { t } = useTranslation()
  const connected = servers.filter(s => s.status?.reachable).length
  const unreachable = servers.filter(s => s.status && !s.status.reachable).length

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard icon={HardDrive} label={t('Total Servers')} value={servers.length} color="primary" />
      <StatCard icon={Check} label={t('Connected')} value={connected} color="emerald" />
      <StatCard icon={X} label={t('Unreachable')} value={unreachable} color="red" />
    </div>
  )
}
