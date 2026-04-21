import { Elysia } from 'elysia'
import { openapi, fromTypes } from '@elysiajs/openapi'
import { cors } from '@elysiajs/cors'
import { config } from './config'
import { keycloakPlugin } from './lib/keycloak-plugin'
import { fhirRoutes } from './routes/fhir'
import { statusRoutes } from './routes/status'
import { serverDiscoveryRoutes } from './routes/fhir-servers'
import { oauthMonitoringRoutes } from './routes/oauth-monitoring'
import { oauthWebSocket } from './routes/oauth-websocket'
import { fhirMonitoringRoutes } from './routes/fhir-monitoring'
import { fhirProxyMonitoringRoutes } from './routes/fhir-proxy-monitoring'
import { consentMonitoringRoutes } from './routes/consent-monitoring'
import { adminAuditMonitoringRoutes } from './routes/admin-audit-monitoring'
import { emailMonitoringRoutes } from './routes/email-monitoring'
import { authMonitoringRoutes } from './routes/auth-monitoring'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { apiRoutes } from './routes/api'
import { aiRoutes, aiPublicRoutes } from './routes/admin/ai'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * Export configuration - uses values from config module (which reads from .env and package.json)
 * No hardcoded values - everything comes from environment or package.json
 */
const exportConfig = {
  name: config.name,
  displayName: config.displayName,
  version: config.version,
  baseUrl: config.baseUrl,
  port: config.port,
  keycloak: {
    serverUrl: config.keycloak.publicUrl || config.keycloak.baseUrl || 'http://localhost:8080',
    realm: config.keycloak.realm || 'proxy-smart',
    jwksUri: config.keycloak.jwksUri,
  },
  fhir: {
    serverBases: config.fhir.serverBases,
  },
  cors: {
    allowedOrigins: config.cors.origins,
  },
}

// Create the same app configuration as the main server
const app = new Elysia({
  name: exportConfig.name,
  serve: {
    idleTimeout: 120
  },
  websocket: {
    idleTimeout: 120
  },
  aot: true,
  sanitize: (value) => Bun.escapeHTML(value)
})
  .use(cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  }))
  .use(openapi({
    path: '/swagger',
    references: fromTypes(
      process.env.NODE_ENV === 'production'
        ? 'dist/index.d.ts'
        : 'src/index.ts',
      {
        projectRoot: join(import.meta.dir, '..')
      }
    ),
    documentation: {
      info: {
        title: exportConfig.displayName,
        version: exportConfig.version,
        description: 'SMART on FHIR Proxy + Healthcare Administration API using Keycloak and Elysia',
      },
      tags: [
        { name: 'authentication', description: 'Authentication and authorization endpoints' },
        { name: 'users', description: 'Healthcare user management' },
        { name: 'admin', description: 'Administrative operations' },
        { name: 'fhir', description: 'FHIR resource proxy endpoints' },
        { name: 'servers', description: 'FHIR server discovery endpoints' },
        { name: 'identity-providers', description: 'Identity provider management' },
        { name: 'smart-apps', description: 'SMART on FHIR configuration endpoints' },
        { name: 'oauth-ws-monitoring', description: 'OAuth monitoring via WebSocket' },
        { name: 'oauth-sse-monitoring', description: 'OAuth monitoring via Server-Sent Events' },
        { name: 'ai', description: 'AI assistant endpoints with unified internal and MCP tools' },
        { name: 'mcp-management', description: 'MCP server management endpoints' },
        { name: 'consent-monitoring', description: 'Consent decision monitoring and analytics' },
        { name: 'fhir-proxy-monitoring', description: 'FHIR proxy request metrics and error tracking' },
        { name: 'admin-audit-monitoring', description: 'Admin action audit trail and analytics' },
        { name: 'email-monitoring', description: 'Email event monitoring (password resets, verifications)' },
        { name: 'auth-monitoring', description: 'Auth event monitoring (logins, logouts, registrations, token exchanges)' },
        { name: 'shl', description: 'SMART Health Links for QR-based patient data sharing' },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Bearer token from OAuth2 flow'
          },
          OAuth2: {
            type: 'oauth2',
            description: 'OAuth2 authentication via Keycloak with SMART on FHIR support',
            flows: {
              authorizationCode: {
                authorizationUrl: `${exportConfig.baseUrl}/auth/authorize`,
                tokenUrl: `${exportConfig.baseUrl}/auth/token`,
                refreshUrl: `${exportConfig.baseUrl}/auth/token`,
                scopes: {
                  'openid': 'OpenID Connect authentication',
                  'profile': 'User profile information',
                  'email': 'User email address',
                  'patient/*.read': 'Read all patient data',
                  'patient/*.write': 'Write all patient data',
                  'user/*.read': 'Read all data for current user',
                  'user/*.write': 'Write all data for current user',
                  'launch': 'SMART launch context',
                  'launch/patient': 'SMART launch with patient context',
                  'launch/encounter': 'SMART launch with encounter context',
                  'offline_access': 'Offline access via refresh token'
                }
              },
              password: {
                tokenUrl: `${exportConfig.baseUrl}/auth/token`,
                refreshUrl: `${exportConfig.baseUrl}/auth/token`,
                scopes: {
                  'openid': 'OpenID Connect authentication',
                  'profile': 'User profile information',
                  'email': 'User email address'
                }
              },
              clientCredentials: {
                tokenUrl: `${exportConfig.baseUrl}/auth/token`,
                scopes: {
                  'system/*.read': 'System-level read access to FHIR resources',
                  'system/*.write': 'System-level write access to FHIR resources'
                }
              }
            }
          },
          MutualTLS: {
            type: 'http',
            scheme: 'mutual-tls',
            description: 'Mutual TLS authentication for secure API communication between proxy and FHIR servers. Submit a request to the infrastructure team with full information about your application to obtain a client certificate.'
          }
        }
      },
      security: [
        { OAuth2: ['openid', 'profile', 'email'] },
        { BearerAuth: [] }
      ],
      servers: [
        {
          url: exportConfig.baseUrl,
          description: 'Development server'
        }
      ]
    }
  }))
  .use(keycloakPlugin)
  .use(statusRoutes)
  .use(serverDiscoveryRoutes)
  .use(authRoutes)
  .use(adminRoutes)
  .use(oauthMonitoringRoutes)
  .use(oauthWebSocket)
  .use(fhirMonitoringRoutes)
  .use(fhirProxyMonitoringRoutes)
  .use(consentMonitoringRoutes)
  .use(adminAuditMonitoringRoutes)
  .use(emailMonitoringRoutes)
  .use(authMonitoringRoutes)
  .use(apiRoutes)
  .use(aiPublicRoutes) // Public AI health checks (no auth)
  .use(aiRoutes) // Protected AI routes (with auth)
  .use(fhirRoutes)

// The OpenAPI plugin doesn't expose the spec directly, so we need to start a server
// However, we can optimize it by fetching immediately with minimal delay (100ms)
let serverInstance: ReturnType<typeof app.listen> | null = null

const exportSpec = async () => {
  try {
    // Small delay to ensure server port is available
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const port = serverInstance?.server?.port as number
    
    if (!port) {
      throw new Error('Failed to get server port')
    }
    
    console.log(`🔄 Fetching OpenAPI spec from port ${port}`)
    
    // Fetch the spec - Bun is fast enough that we don't need extra delays
    // Note: with path: '/swagger', the spec is at /swagger/json
    const response = await fetch(`http://localhost:${port}/swagger/json`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const spec = await response.json()

    // @elysiajs/openapi hardcodes openapi: "3.0.3" but Elysia's TypeBox resolver
    // emits 3.1 constructs (e.g. {type: "null"} in anyOf unions).
    // Declare the spec as 3.1.0 — what it actually is.
    // The sanitize-openapi.ts step will properly downgrade to 3.0.3 if needed.
    spec.openapi = '3.1.0'
    
    // Add custom OpenAPI extensions for authentication configuration
    spec['x-jwks-uri'] = exportConfig.keycloak.jwksUri || `${exportConfig.baseUrl}/.well-known/jwks.json`
    spec['x-issuer'] = exportConfig.keycloak.serverUrl ? 
      `${exportConfig.keycloak.serverUrl}/realms/${exportConfig.keycloak.realm}` : 
      exportConfig.baseUrl
    spec['x-audience'] = process.env.JWT_AUDIENCE || exportConfig.baseUrl
    spec['x-token-endpoint'] = `${exportConfig.baseUrl}/auth/token`
    spec['x-authorization-endpoint'] = `${exportConfig.baseUrl}/auth/authorize`
    spec['x-userinfo-endpoint'] = `${exportConfig.baseUrl}/auth/userinfo`
    
    console.log('📝 Added custom OpenAPI extensions:')
    console.log(`   x-jwks-uri: ${spec['x-jwks-uri']}`)
    console.log(`   x-issuer: ${spec['x-issuer']}`)
    console.log(`   x-audience: ${spec['x-audience']}`)
    
    // Ensure dist directory exists
    const distDir = join(process.cwd(), 'dist')
    mkdirSync(distDir, { recursive: true })

    // Write to backend dist
    const outputPath = join(distDir, 'openapi.json')
    const specJson = JSON.stringify(spec, null, 2)
    writeFileSync(outputPath, specJson)
    console.log(`✅ OpenAPI spec exported to: ${outputPath}`)
    
    serverInstance?.stop()
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to export OpenAPI spec:', error)
    serverInstance?.stop()
    process.exit(1)
  }
}

serverInstance = app.listen(0, exportSpec)
