import { Badge, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@max-health-inc/shared-ui';
import {
  Activity,
  CheckCircle,
  Search,
  Shield,
  XCircle,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ACTION_ICONS, actionColor, statusColor } from './helpers';
import { EmptyState } from '@/components/ui/empty-state';
import type { AdminAuditEvent } from '../../service/admin-audit-service';

interface EventLogTabProps {
  events: AdminAuditEvent[];
  filteredEvents: AdminAuditEvent[];
  uniqueResources: string[];
  filterAction: string;
  setFilterAction: (v: string) => void;
  filterResource: string;
  setFilterResource: (v: string) => void;
  filterSuccess: string;
  setFilterSuccess: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}

export function EventLogTab({
  events,
  filteredEvents,
  uniqueResources,
  filterAction,
  setFilterAction,
  filterResource,
  setFilterResource,
  filterSuccess,
  setFilterSuccess,
  searchTerm,
  setSearchTerm,
}: EventLogTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Filter Audit Events')}</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">{t('Action:')}</label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All')}</SelectItem>
                <SelectItem value="create">{t('Create')}</SelectItem>
                <SelectItem value="update">{t('Update')}</SelectItem>
                <SelectItem value="delete">{t('Delete')}</SelectItem>
                <SelectItem value="action">{t('Action')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">{t('Resource:')}</label>
            <Select value={filterResource} onValueChange={setFilterResource}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Resources')}</SelectItem>
                {uniqueResources.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">{t('Status:')}</label>
            <Select value={filterSuccess} onValueChange={setFilterSuccess}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All')}</SelectItem>
                <SelectItem value="true">{t('Success')}</SelectItem>
                <SelectItem value="false">{t('Failure')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('Search by actor, path, resource...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:min-w-[220px]"
            />
          </div>
        </div>
      </div>

      {/* Events table */}
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Audit Event Log')}</h4>
            <p className="text-muted-foreground font-medium">
              {t('Showing {{count}} of {{total}} events', { count: filteredEvents.length, total: events.length })}
            </p>
          </div>
        </div>

        {filteredEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>{t('Time')}</TableHead>
                  <TableHead>{t('Actor')}</TableHead>
                  <TableHead>{t('Action')}</TableHead>
                  <TableHead>{t('Resource')}</TableHead>
                  <TableHead>{t('Resource ID')}</TableHead>
                  <TableHead>{t('Method')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Duration')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.slice(0, 100).map((event) => {
                  const ActionIcon = ACTION_ICONS[event.action] ?? Zap;
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-medium text-foreground max-w-[140px] truncate" title={`${event.actor.username ?? event.actor.sub}\n${event.actor.email ?? ''}`}>
                        {event.actor.username ?? event.actor.sub}
                      </TableCell>
                      <TableCell>
                        <Badge className={actionColor(event.action)}>
                          <ActionIcon className="w-3 h-3 mr-1" />
                          {event.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{event.resource}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[120px] truncate" title={event.resourceId ?? ''}>
                        {event.resourceId || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-mono">{event.method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor(event.success)}>
                          {event.success ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {event.statusCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{event.durationMs}ms</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredEvents.length > 100 && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">{t('Showing first 100 events of {{total}}', { total: filteredEvents.length })}</p>
              </div>
            )}
          </div>
        ) : (
          <EmptyState icon={Shield} title={t('No audit events match your filters')} description={t('Try adjusting your filter criteria')} />
        )}
      </div>
    </div>
  );
}
