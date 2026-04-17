import { Elysia, t } from 'elysia'
import { extractBearerToken, UNAUTHORIZED_RESPONSE } from '@/lib/admin-utils'
import { handleAdminError } from '@/lib/admin-error-handler'
import { getAllServers, getServerByName } from '@/lib/fhir-server-store'
import { logger } from '@/lib/logger'

/**
 * Admin FHIR Seed — PUT/POST FHIR resources directly to configured FHIR servers.
 * 
 * Bypasses the SMART proxy (no scope enforcement) because the backend connects
 * to the upstream FHIR server URL directly.  Requires an admin-level Bearer token.
 */

const FhirResourceBody = t.Object({
  resourceType: t.String({ description: 'FHIR resource type (e.g. Patient, Practitioner, Person)' }),
  id: t.Optional(t.String({ description: 'Resource ID (required for PUT)' })),
}, { additionalProperties: true, description: 'FHIR R4 resource' })

const SeedResourceRequest = t.Object({
  serverName: t.Optional(t.String({ description: 'FHIR server identifier. Defaults to first configured server.' })),
  resource: FhirResourceBody,
})

const SeedBundleRequest = t.Object({
  serverName: t.Optional(t.String({ description: 'FHIR server identifier. Defaults to first configured server.' })),
  resources: t.Array(FhirResourceBody, { minItems: 1, description: 'Array of FHIR resources to seed' }),
})

const SeedResponse = t.Object({
  success: t.Boolean(),
  resourceType: t.Optional(t.String()),
  id: t.Optional(t.String()),
  status: t.Optional(t.Number()),
  message: t.Optional(t.String()),
})

const SeedBundleResponse = t.Object({
  success: t.Boolean(),
  results: t.Array(t.Object({
    resourceType: t.String(),
    id: t.Optional(t.String()),
    status: t.Number(),
    success: t.Boolean(),
    error: t.Optional(t.String()),
  })),
  total: t.Number(),
  succeeded: t.Number(),
  failed: t.Number(),
})

async function resolveServerUrl(serverName?: string): Promise<string> {
  if (serverName) {
    const url = await getServerByName(serverName)
    if (!url) throw new Error(`FHIR server '${serverName}' not found`)
    return url
  }
  const servers = await getAllServers()
  if (servers.length === 0) throw new Error('No FHIR servers configured')
  return servers[0].url
}

async function putResource(serverUrl: string, resourceType: string, id: string, body: unknown): Promise<{ status: number; body: unknown }> {
  const url = `${serverUrl}/${resourceType}/${id}`
  logger.fhir.info(`FHIR seed: PUT ${url}`)
  const resp = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
    body: JSON.stringify(body),
  })
  const text = await resp.text()
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { parsed = text }
  return { status: resp.status, body: parsed }
}

export const fhirSeedRoutes = new Elysia({ prefix: '/fhir-seed', tags: ['fhir-seed'] })

  // PUT a single FHIR resource
  .post('/', async ({ body, headers, set }) => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return UNAUTHORIZED_RESPONSE }

      const { serverName, resource } = body
      if (!resource.id) { set.status = 400; return { success: false, message: 'Resource must have an id for PUT' } }

      const serverUrl = await resolveServerUrl(serverName)
      const result = await putResource(serverUrl, resource.resourceType, resource.id, resource)

      if (result.status >= 400) {
        set.status = result.status
        return { success: false, resourceType: resource.resourceType, id: resource.id, status: result.status, message: JSON.stringify(result.body) }
      }

      return { success: true, resourceType: resource.resourceType, id: resource.id, status: result.status }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    body: SeedResourceRequest,
    response: { 200: SeedResponse, 201: SeedResponse, 400: SeedResponse, 401: t.Object({ error: t.String() }), 500: t.Object({ error: t.String() }) },
    detail: { summary: 'Seed FHIR Resource', description: 'PUT a single FHIR resource directly to the upstream FHIR server (admin only)', tags: ['fhir-seed'] },
  })

  // PUT multiple FHIR resources at once
  .post('/bundle', async ({ body, headers, set }) => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return UNAUTHORIZED_RESPONSE }

      const { serverName, resources } = body
      const serverUrl = await resolveServerUrl(serverName)

      const results: Array<{ resourceType: string; id?: string; status: number; success: boolean; error?: string }> = []
      for (const resource of resources) {
        if (!resource.id) {
          results.push({ resourceType: resource.resourceType, status: 400, success: false, error: 'Missing id' })
          continue
        }
        try {
          const result = await putResource(serverUrl, resource.resourceType, resource.id, resource)
          results.push({
            resourceType: resource.resourceType,
            id: resource.id,
            status: result.status,
            success: result.status < 400,
            ...(result.status >= 400 ? { error: JSON.stringify(result.body) } : {}),
          })
        } catch (err) {
          results.push({
            resourceType: resource.resourceType,
            id: resource.id,
            status: 500,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      const succeeded = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      logger.fhir.info(`FHIR seed bundle: ${succeeded} succeeded, ${failed} failed`)

      return { success: failed === 0, results, total: results.length, succeeded, failed }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    body: SeedBundleRequest,
    response: { 200: SeedBundleResponse, 401: t.Object({ error: t.String() }), 500: t.Object({ error: t.String() }) },
    detail: { summary: 'Seed FHIR Bundle', description: 'PUT multiple FHIR resources directly to the upstream FHIR server (admin only)', tags: ['fhir-seed'] },
  })
