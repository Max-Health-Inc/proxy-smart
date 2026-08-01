/**
 * An MCP client's token must be able to reach the admin tools the MCP endpoint exposes.
 *
 * THE BUG. The MCP endpoint generates its entire tool surface from the admin routes — roughly a
 * hundred create_admin_* / update_admin_* / delete_admin_* tools. But `validateAdminToken` required
 * the token's audience to be `admin-ui` or `admin-service`, and an MCP client can never have
 * either: it registers through DCR and receives its own client id, so its access token is
 * audienced to the MCP resource (RFC 8707). Every one of those tools therefore answered 403 for
 * every MCP client, including the pre-registered `mcp-client`. Observed 2026-08-01 calling
 * read_resource on /admin/roles/.../composites through the live claude.ai connector.
 *
 * WHAT THIS DOES NOT RELAX. Audience says WHICH CLIENT the token was minted for; roles say WHAT
 * THE USER MAY DO. Requiring the audience to be the admin UI conflated the two. Admitting the MCP
 * resource as an admin audience keeps the role requirement completely intact — a token with no
 * admin role is still refused, and a SMART app token audienced to the FHIR base is still refused,
 * which is the separation the audience check exists to enforce.
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { signTestToken } from './helpers/jwt-test-keys'

const KC_BASE = 'http://localhost:8080'
const REALM = 'proxy-smart'
const ISSUER = `${KC_BASE}/realms/${REALM}`
const PROXY_BASE = 'http://localhost:8445'
const FHIR_SERVER_BASE = 'http://localhost:8081/fhir'
const FHIR_BASE_AUD = `${PROXY_BASE}/proxy-smart-backend/hapi/R4`
const MCP_AUD = `${PROXY_BASE}/mcp`

const ENV: Record<string, string> = {
  KEYCLOAK_BASE_URL: KC_BASE,
  KEYCLOAK_PUBLIC_URL: KC_BASE,
  KEYCLOAK_REALM: REALM,
  KEYCLOAK_ADMIN_CLIENT_ID: 'admin-service',
  KEYCLOAK_ADMIN_UI_CLIENT_ID: 'admin-ui',
  BASE_URL: PROXY_BASE,
  FHIR_SERVER_BASE,
  MCP_ENDPOINT_PATH: '/mcp',
}
const SNAPSHOT: Record<string, string | undefined> = {}

beforeAll(() => {
  for (const [k, v] of Object.entries(ENV)) {
    SNAPSHOT[k] = process.env[k]
    process.env[k] = v
  }
})
afterAll(() => {
  for (const k of Object.keys(ENV)) {
    if (SNAPSHOT[k] === undefined) delete process.env[k]
    else process.env[k] = SNAPSHOT[k]!
  }
})

const { validateAdminToken } = await import('../src/lib/auth')
const { PRODUCT_ADMIN_ROLE } = await import('../src/lib/admin-roles')

/** A token as an MCP client receives it: audienced to the MCP resource, azp = its own DCR id. */
function mcpToken(roles: string[] = []): string {
  return signTestToken({
    iss: ISSUER,
    sub: 'user-1',
    aud: MCP_AUD,
    azp: 'smart_app_dcr_generated_id',
    realmRoles: roles,
  })
}

async function rejects(promise: Promise<unknown>): Promise<boolean> {
  try {
    await promise
    return false
  } catch {
    return true
  }
}

describe('an MCP-audienced token at the admin call site', () => {
  it('is ACCEPTED when the user holds an admin role', async () => {
    // The regression: this used to throw on audience alone, making the whole admin tool surface
    // dead for every MCP client.
    expect(await rejects(validateAdminToken(mcpToken([PRODUCT_ADMIN_ROLE])))).toBe(false)
  })

  it('is accepted for a legacy admin role too, during transition', async () => {
    expect(await rejects(validateAdminToken(mcpToken(['realm-admin'])))).toBe(false)
  })

  it('is still REFUSED when the user holds no admin role', async () => {
    // Authority still comes from roles. Admitting the audience must not admit everyone.
    expect(await rejects(validateAdminToken(mcpToken(['user', 'offline_access'])))).toBe(true)
    expect(await rejects(validateAdminToken(mcpToken([])))).toBe(true)
  })
})

describe('the separation the audience check exists for is preserved', () => {
  it('still REFUSES a SMART app token audienced to the FHIR base, even with an admin role', async () => {
    // This is the case the original audience restriction was written to stop: a patient-facing
    // token reaching admin operations. It must keep failing.
    const patientToken = signTestToken({
      iss: ISSUER,
      sub: 'user-1',
      aud: FHIR_BASE_AUD,
      azp: 'patient-portal',
      realmRoles: [PRODUCT_ADMIN_ROLE],
    })
    expect(await rejects(validateAdminToken(patientToken))).toBe(true)
  })

  it('still accepts the admin UI and the admin service account', async () => {
    for (const azp of ['admin-ui', 'admin-service']) {
      const token = signTestToken({
        iss: ISSUER,
        sub: 'user-1',
        azp,
        realmRoles: ['admin'],
      })
      expect(await rejects(validateAdminToken(token))).toBe(false)
    }
  })
})
