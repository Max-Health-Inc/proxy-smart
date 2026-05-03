import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@max-health-inc/shared-ui';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { actionColor } from './helpers';
import { EmptyState } from '@/components/ui/empty-state';
import type { AdminAuditAnalytics } from '../../service/admin-audit-service';

interface FailuresTabProps {
  analytics: AdminAuditAnalytics | null;
}

export function FailuresTab({ analytics }: FailuresTabProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center shadow-sm">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Recent Failures')}</h4>
          <p className="text-muted-foreground font-medium">{t('Admin actions that returned error status codes')}</p>
        </div>
      </div>

      {analytics?.recentFailures && analytics.recentFailures.length > 0 ? (
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t('Time')}</TableHead>
                <TableHead>{t('Actor')}</TableHead>
                <TableHead>{t('Action')}</TableHead>
                <TableHead>{t('Resource')}</TableHead>
                <TableHead>{t('Path')}</TableHead>
                <TableHead>{t('Status Code')}</TableHead>
                <TableHead>{t('Duration')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.recentFailures.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {event.actor.username ?? event.actor.sub}
                  </TableCell>
                  <TableCell>
                    <Badge className={actionColor(event.action)}>{event.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">{event.resource}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate font-mono text-xs" title={event.path}>
                    {event.path}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                      <XCircle className="w-3 h-3 mr-1" />{event.statusCode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{event.durationMs}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={CheckCircle} title={t('No recent failures')} description={t('All admin actions completed successfully')} />
      )}
    </div>
  );
}
