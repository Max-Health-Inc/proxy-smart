import { Elysia } from 'elysia'
import { openapi, fromTypes } from '@elysiajs/openapi'
import { cors } from '@elysiajs/cors'
import staticPlugin from '@elysiajs/static'
import { join } from 'path'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { keycloakPlugin } from './lib/keycloak-plugin'
import { fhirRoutes } from './routes/fhir'
import { statusRoutes } from './routes/status'
import { serverDiscoveryRoutes } from './routes/fhir-servers'
import { oauthMonitoringRoutes } from './routes/oauth-monitoring'
import { oauthWebSocket } from './routes/oauth-websocket'
import { consentMonitoringRoutes } from './routes/consent-monitoring'
import { consentWebSocket } from './routes/consent-websocket'
import { fhirMonitoringRoutes } from './routes/fhir-monitoring'
import { fhirProxyMonitoringRoutes } from './routes/fhir-proxy-monitoring'
import { adminAuditMonitoringRoutes } from './routes/admin-audit-monitoring'
import { config } from './config'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { mcpMetadataRoutes } from './routes/auth/mcp-metadata'
import { mcpEndpointRoutes } from './routes/mcp-endpoint'
import { docsRoutes } from './routes/docs'
import { brandBundleService } from './lib/brand-bundle'
import { UserAccessBrandBundle } from './schemas'

/** Scan public/apps/ for sub-apps with smart-manifest.json and return discovery list */
function discoverApps() {
    const appsDir = join(import.meta.dir, '..', 'public', 'apps')
    if (!existsSync(appsDir)) return []

    return readdirSync(appsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => {
            const manifestPath = join(appsDir, d.name, 'smart-manifest.json')
            if (!existsSync(manifestPath)) return null
            try {
                const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
                return {
                    id: d.name,
                    launch_url: `/apps/${d.name}/`,
                    client_id: manifest.client_id ?? d.name,
                    client_name: manifest.client_name ?? d.name,
                    description: manifest.description ?? '',
                    scope: manifest.scope ?? '',
                    category: manifest.category ?? 'other',
                    icon: manifest.icon ?? 'app-window',
                    grant_types: manifest.grant_types ?? ['authorization_code'],
                    token_endpoint_auth_method: manifest.token_endpoint_auth_method ?? 'none',
                }
            } catch { return null }
        })
        .filter(Boolean)
}

export function createApp() {
    const app = new Elysia({
        name: config.name,
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
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Mcp-Session-Id', 'Mcp-Protocol-Version']
        }))
        .use(openapi({
            path: '/swagger',
            references: fromTypes(
                process.env.NODE_ENV === 'production' ? 'dist/index.d.ts' : 'src/index.ts',
                { projectRoot: join(import.meta.dir, '..') }
            ),
            documentation: {
                info: {
                    title: config.displayName,
                    version: config.version,
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
                    { name: 'access-control', description: 'Physical access control (Kisi / UniFi Access)' },
                    { name: 'oauth-ws-monitoring', description: 'OAuth monitoring via WebSocket' },
                    { name: 'oauth-sse-monitoring', description: 'OAuth monitoring via Server-Sent Events' },
                    { name: 'ai', description: 'AI assistant endpoints with unified internal and MCP tools' },
                    { name: 'mcp-management', description: 'MCP server management endpoints' },
                    { name: 'mcp-endpoint', description: 'Built-in MCP Streamable HTTP server endpoint' },
                    { name: 'consent-monitoring', description: 'Consent decision monitoring and analytics' },
                    { name: 'fhir-monitoring', description: 'FHIR server uptime monitoring' },
                    { name: 'fhir-proxy-monitoring', description: 'FHIR proxy request metrics and error tracking' },
                    { name: 'admin-audit-monitoring', description: 'Admin action audit trail and analytics' },
                ],
                servers: [
                    { url: config.baseUrl, description: 'Development server' }
                ]
            }
        }))
        .use(staticPlugin({ 
            assets: 'public', 
            prefix: '/',
            alwaysStatic: true,
            indexHTML: false
        }))
        .get('/webapp', () => Bun.file('public/webapp/index.html'))
        .get('/webapp/', () => Bun.file('public/webapp/index.html'))
        .get('/', () => Bun.file('public/index.html'))
        // SMART apps directory
        .get('/apps', () => Bun.file('public/apps/index.html'))
        .get('/apps/', () => Bun.file('public/apps/index.html'))
        // Public SMART app discovery endpoint
        .get('/apps.json', () => ({ apps: discoverApps() }))
        // User-Access Brand Bundle (SMART 2.2.0 Section 8)
        .get('/branding.json', async ({ set, headers }) => {
            const { bundle, etag } = await brandBundleService.getBrandBundle()
            // Support conditional requests (ETag / If-None-Match)
            const ifNoneMatch = headers['if-none-match']
            if (ifNoneMatch && ifNoneMatch === etag) {
                set.status = 304
                return '' as unknown as typeof bundle
            }
            set.headers['etag'] = etag
            set.headers['cache-control'] = 'public, max-age=60'
            return bundle
        }, {
            response: { 200: UserAccessBrandBundle },
            detail: {
                summary: 'User-Access Brand Bundle',
                description: 'FHIR Bundle (collection) of Organization and Endpoint resources for User-Access Brands (SMART 2.2.0 Section 8)',
                tags: ['smart-apps']
            }
        })
        // Dynamic SPA fallback for all sub-apps under /apps/<name>/*
        .get('/apps/:app', async ({ params, set }) => {
            const index = Bun.file(`public/apps/${params.app}/index.html`)
            if (await index.exists()) return index
            set.status = 404
            return { error: 'Not Found' }
        })
        .get('/apps/:app/*', async ({ params, set }) => {
            const index = Bun.file(`public/apps/${params.app}/index.html`)
            if (await index.exists()) return index
            set.status = 404
            return { error: 'Not Found' }
        })
        // VitePress docs SPA fallback
        .get('/docs', () => Bun.file('public/docs/index.html'))
        .get('/docs/', () => Bun.file('public/docs/index.html'))
        .get('/docs/*', async ({ params, set }) => {
            const path = (params as { '*': string })['*']
            const file = Bun.file(`public/docs/${path}`)
            if (await file.exists()) return file
            // SPA fallback for clean URLs (VitePress client-side routing)
            const index = Bun.file('public/docs/index.html')
            if (await index.exists()) return index
            set.status = 404
            return { error: 'Not Found' }
        })
        .use(keycloakPlugin)
        .use(docsRoutes)
        .use(mcpMetadataRoutes)
        .use(statusRoutes)
        .use(serverDiscoveryRoutes)
        .use(authRoutes)
        .use(adminRoutes)
        .use(oauthMonitoringRoutes)
        .use(oauthWebSocket)
        .use(consentMonitoringRoutes)
        .use(consentWebSocket)
        .use(fhirMonitoringRoutes)
        .use(fhirProxyMonitoringRoutes)
        .use(adminAuditMonitoringRoutes)
        .use(mcpEndpointRoutes)
        .use(fhirRoutes)
        .onError(({ code, set, request }) => {
            if (code === 'NOT_FOUND') {
                const accept = request.headers.get('accept') ?? ''
                // Return JSON for API clients
                if (accept.includes('application/json') && !accept.includes('text/html')) {
                    set.status = 404
                    return { error: 'Not Found', path: new URL(request.url).pathname }
                }
                // Return a styled HTML 404 page for browsers
                set.status = 404
                set.headers['content-type'] = 'text/html; charset=utf-8'
                const path = new URL(request.url).pathname
                return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="icon" type="image/svg+xml" href="/proxy-smart.svg"/>
<title>404 — ${Bun.escapeHTML(config.displayName)}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{color-scheme:dark}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#000;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}
.c{text-align:center;max-width:480px;padding:2rem}
h1{font-size:6rem;font-weight:200;line-height:1;margin-bottom:.5rem;color:#a3a3a3}
h2{font-size:1.25rem;font-weight:500;margin-bottom:1rem}
p{color:#737373;font-size:.875rem;margin-bottom:2rem;word-break:break-all}
a{display:inline-block;background:#fff;color:#000;border-radius:6px;padding:8px 20px;font-size:.875rem;font-weight:500;text-decoration:none;transition:opacity .15s}
a:hover{opacity:.85}
</style>
</head>
<body>
<div class="c">
<h1>404</h1>
<h2>Page not found</h2>
<p>${Bun.escapeHTML(path)}</p>
<a href="/">Back to Home</a>
</div>
</body>
</html>`
            }
        })

    return app
}
