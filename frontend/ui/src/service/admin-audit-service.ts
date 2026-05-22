/**
 * Admin Audit Service — SSE-based real-time monitoring for admin actions.
 */
import { config } from '@/config';
import { createMonitoringService } from './create-monitoring-service';
import type { AdminAuditEvent, AdminAuditAnalyticsResponse as AdminAuditAnalytics } from '@/lib/types/api';

export type { AdminAuditEvent, AdminAuditAnalytics };

const service = createMonitoringService<AdminAuditEvent, AdminAuditAnalytics>({
  domain: 'admin-audit',
  isAnalyticsPayload: (d): d is AdminAuditAnalytics =>
    typeof d === 'object' && d !== null && 'totalActions' in d,
});

export const adminAuditService = Object.assign(service, {
  /** Download the full audit log as a JSONL file. */
  async exportJsonl(): Promise<void> {
    const token = await (async () => {
      const { getStoredToken } = await import('@/lib/apiClient');
      const t = await getStoredToken();
      if (!t) throw new Error('No authentication token');
      return t;
    })();

    const res = await fetch(`${config.api.baseUrl}/monitoring/admin-audit/events/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to export audit log');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-audit-${new Date().toISOString().slice(0, 10)}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
});
