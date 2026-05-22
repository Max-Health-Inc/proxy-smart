/**
 * Email Events Monitoring Service — SSE-based real-time monitoring for
 * Keycloak email events (SEND_RESET_PASSWORD, SEND_VERIFY_EMAIL, etc.).
 */
import { createMonitoringService } from './create-monitoring-service';
import type { EmailEvent, EmailAnalyticsResponse as EmailAnalytics } from '@/lib/types/api';

export type { EmailEvent, EmailAnalytics };

export const emailMonitoringService = createMonitoringService<EmailEvent, EmailAnalytics>({
  domain: 'email',
});
