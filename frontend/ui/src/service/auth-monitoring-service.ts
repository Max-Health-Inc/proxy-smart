/**
 * Auth Events Monitoring Service — SSE-based real-time monitoring for
 * Keycloak authentication events (LOGIN, LOGOUT, REGISTER, etc.).
 */
import { createMonitoringService } from './create-monitoring-service';
import type { AuthEvent, AuthAnalyticsResponse as AuthAnalytics } from '@/lib/types/api';

export type { AuthEvent, AuthAnalytics };

export const authMonitoringService = createMonitoringService<AuthEvent, AuthAnalytics>({
  domain: 'auth',
});
