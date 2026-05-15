import { Elysia, t } from 'elysia'
import { collectSystemStatus } from '../lib/system-status'
import { 
  HealthResponse, 
  SystemStatusResponse, 
  type HealthResponseType,
  type SystemStatusResponseType
} from '../schemas'

// Legacy helper removed: FHIR server health collection centralized in system-status.ts

/**
 * General server information endpoints
 */
export const statusRoutes = new Elysia({ tags: ['server', 'info', 'health'] })

  // Liveness probe — always 200 as long as the process is running.
  // Subsystem health (FHIR, Keycloak) is reported in the payload body
  // but never affects the HTTP status code. Caddy uses this to decide
  // whether to route traffic; we ALWAYS want it routed to us so we can
  // serve the landing page, admin UI, and graceful error messages.
  .get('/health', async ({ query }): Promise<HealthResponseType> => {
    const force = query.force === '1';
    try {
      const full = await collectSystemStatus(force);
      return {
        status: full.overall,
        timestamp: full.timestamp,
        uptime: full.uptime
      };
    } catch {
      return { status: 'degraded', timestamp: new Date().toISOString(), uptime: process.uptime() * 1000 };
    }
  }, {
    query: t.Object({
      force: t.Optional(t.String())
    }),
    response: {
      200: HealthResponse
    },
    detail: {
      summary: 'Liveness Probe',
      description: 'Always returns 200 if the backend process is running. Subsystem health is in the response body. Use /status for detailed diagnostics.',
      tags: ['server']
    }
  })

  // System status endpoint - comprehensive system health check
  .get('/status', async (): Promise<SystemStatusResponseType> => {
    return await collectSystemStatus(true);
  }, {
    response: {
      200: SystemStatusResponse
    },
    detail: {
      summary: 'System Status',
      description: 'Comprehensive system status (cached components)',
      tags: ['server']
    }
  })

