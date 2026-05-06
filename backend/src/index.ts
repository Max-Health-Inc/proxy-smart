import { config } from './config'
import { logger } from './lib/logger'
import { initializeServer, displayServerEndpoints } from './init'
import { oauthMetricsLogger } from './lib/oauth-metrics-logger'
import { consentMetricsLogger } from './lib/consent-metrics-logger'
import { fhirHealthLogger } from './lib/fhir-health-logger'
import { fhirProxyMetricsLogger } from './lib/fhir-proxy-metrics-logger'
import { adminAuditLogger } from './lib/admin-audit-logger'
import { emailEventsLogger } from './lib/email-events-logger'
import { authEventsLogger } from './lib/auth-events-logger'
import { createApp } from './app-factory'
import { existsSync, readFileSync } from 'fs'

// Security guard: refuse to start with dev auth bypass in production
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_AUTH_BYPASS === 'true') {
  console.error('FATAL: ALLOW_DEV_AUTH_BYPASS=true is set in production. This is a security risk. Refusing to start.')
  process.exit(1)
}
if (process.env.NODE_ENV === 'production' && (process.env.AI_AUTH_OPTIONAL || '').toLowerCase() === 'true') {
  console.error('FATAL: AI_AUTH_OPTIONAL=true is set in production. This is a security risk. Refusing to start.')
  process.exit(1)
}

const app = createApp()

// Export the app instance for type generation
export { app }

// Initialize and start server
initializeServer()
  .then(async () => {
    // Initialize OAuth metrics logger
    await oauthMetricsLogger.initialize();

    // Initialize Consent metrics logger
    await consentMetricsLogger.initialize();

    // Initialize Admin audit logger
    await adminAuditLogger.initialize();

    // Initialize FHIR health logger and start background checks (every 30s)
    await fhirHealthLogger.initialize();
    fhirHealthLogger.start();

    // Initialize FHIR proxy metrics logger
    await fhirProxyMetricsLogger.initialize();

    // Initialize Email events logger and start background polling (every 60s)
    await emailEventsLogger.initialize();
    emailEventsLogger.start();

    // Initialize Auth events logger and start background polling (every 60s)
    await authEventsLogger.initialize();
    authEventsLogger.start();

    try {
      // In containerized environments (Docker), listen on all interfaces
      // In local development, default to localhost only
      const listenOptions: Record<string, unknown> = process.env.NODE_ENV === 'production' || process.env.DOCKER
        ? { port: config.port, hostname: '0.0.0.0' }
        : { port: config.port };

      // Enable TLS when cert/key files are provided (e.g., CI compliance testing)
      const tlsCert = process.env.TLS_CERT_FILE
      const tlsKey = process.env.TLS_KEY_FILE
      if (tlsCert && tlsKey && existsSync(tlsCert) && existsSync(tlsKey)) {
        listenOptions.tls = {
          cert: readFileSync(tlsCert),
          key: readFileSync(tlsKey),
        }
        logger.server.info('TLS enabled via TLS_CERT_FILE / TLS_KEY_FILE')
      }

      app.listen(listenOptions, async () => {
        logger.server.info(`🚀 Server successfully started on port ${config.port}`)
        await displayServerEndpoints()
      })
    } catch (listenError) {
      logger.server.error('Failed to start HTTP server', {
        error: listenError instanceof Error ? {
          message: listenError.message,
          stack: listenError.stack,
          name: listenError.name,
          cause: listenError.cause
        } : String(listenError),
        port: config.port,
        baseUrl: config.baseUrl,
        processId: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      })

      // Check if it's a port binding issue
      if (listenError instanceof Error && (
        listenError.message.includes('EADDRINUSE') ||
        listenError.message.includes('address already in use') ||
        listenError.message.includes('bind')
      )) {
        logger.server.error(`❌ Port ${config.port} is already in use. Please:`)
        logger.server.error('   1. Stop any other processes using this port')
        logger.server.error('   2. Change the PORT environment variable')
        logger.server.error(`   3. Or kill the process using: netstat -ano | findstr :${config.port}`)
      }

      throw listenError
    }
  })
  .catch((error) => {
    logger.server.error('❌ Proxy Smart failed to start', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      } : String(error),
      config: {
        port: config.port,
        baseUrl: config.baseUrl,
        keycloak: {
          baseUrl: config.keycloak.baseUrl,
          realm: config.keycloak.realm,
          jwksUri: config.keycloak.jwksUri
        },
        fhir: {
          serverBases: config.fhir.serverBases
        }
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        processId: process.pid,
        workingDirectory: process.cwd(),
        environmentVars: {
          BASE_URL: process.env.BASE_URL,
          PORT: process.env.PORT,
          KEYCLOAK_BASE_URL: process.env.KEYCLOAK_BASE_URL,
          KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
          FHIR_SERVER_BASE: process.env.FHIR_SERVER_BASE
        }
      },
      timestamp: new Date().toISOString()
    })

    // Provide helpful debugging information
    logger.server.error('')
    logger.server.error('🔍 Debugging steps:')
    logger.server.error('   1. Check if all required environment variables are set')
    logger.server.error('   2. Verify Keycloak is running and accessible')
    logger.server.error('   3. Check if FHIR server URLs are reachable')
    logger.server.error('   4. Ensure port is not already in use')
    logger.server.error('   5. Check network connectivity and firewall settings')
    logger.server.error('')

    process.exit(1)
  })

// Graceful shutdown
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    logger.server.info(`${signal} received — shutting down gracefully`)
    app.stop().finally(() => process.exit(0))
  })
}