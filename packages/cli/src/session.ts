/**
 * Session + token lifecycle for the CLI.
 *
 * Responsibilities:
 *   - persist / read the cached token under ~/.proxy-smart/token.json
 *   - discover OAuth endpoints from the proxy's mirrored OIDC discovery
 *     document by default, so tokens are minted through the proxy auth layer
 *     (audience binding, token enrichment, access control). Direct Keycloak is
 *     an explicit opt-in escape hatch (config.directKeycloak).
 *   - run the interactive device authorization flow (RFC 8628)
 *   - run the client_credentials flow (CI)
 *   - hand out a valid access token, transparently refreshing when possible
 *
 * The pure URL/body building lives in oauth.ts; this module owns the I/O.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { type ResolvedConfig, tokenCachePath, clearTokenCache } from './config'
import {
  type AuthEndpoints,
  type DeviceAuthResponse,
  type TokenSet,
  asTokenError,
  clientCredentialsBody,
  deviceAuthBody,
  deviceTokenBody,
  endpointsFromMetadata,
  expiresAt,
  isTokenFresh,
  keycloakEndpoints,
  parseDeviceAuthResponse,
  parseOidcMetadata,
  parseTokenSet,
  proxyDiscoveryUrl,
  refreshTokenBody,
} from './oauth'
import { CliError } from './output'

/** Cached token record persisted to disk. */
export interface CachedToken {
  access_token: string
  refresh_token?: string
  /** Absolute expiry of the access token (epoch seconds). */
  expires_at?: number
  /** Absolute expiry of the refresh token (epoch seconds). */
  refresh_expires_at?: number
  scope?: string
  /** Client id the token was issued for (used to keep refresh consistent). */
  client_id: string
}

const FORM_HEADERS = { 'content-type': 'application/x-www-form-urlencoded' } as const

/** Read the cached token from disk, tolerating a missing/corrupt file. */
export function readCachedToken(homeDir: string): CachedToken | undefined {
  const file = tokenCachePath(homeDir)
  if (!existsSync(file)) return undefined
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf-8'))
    if (parsed && typeof parsed === 'object' && 'access_token' in parsed) {
      return parsed as CachedToken
    }
    return undefined
  } catch {
    return undefined
  }
}

/** Persist a token to disk with owner-only permissions. */
export function writeCachedToken(homeDir: string, token: CachedToken): void {
  mkdirSync(homeDir, { recursive: true })
  writeFileSync(tokenCachePath(homeDir), `${JSON.stringify(token, null, 2)}\n`, { mode: 0o600 })
}

/** Map a fresh token response onto a persisted CachedToken. */
export function toCachedToken(tokens: TokenSet, clientId: string, now = Math.floor(Date.now() / 1000)): CachedToken {
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt(tokens.expires_in, now),
    refresh_expires_at: expiresAt(tokens.refresh_expires_in, now),
    scope: tokens.scope,
    client_id: clientId,
  }
}

/** Callback used to report device-flow progress to the user. */
export type DevicePrompt = (info: DeviceAuthResponse) => void

/**
 * Manages OAuth endpoints + token acquisition for a single CLI invocation.
 * Discovery results are memoized for the lifetime of the instance.
 */
export class Session {
  private endpoints?: AuthEndpoints

  constructor(
    private readonly config: ResolvedConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /**
   * Resolve OAuth endpoints.
   *
   * Default: discover from the proxy's mirrored OIDC document so every grant
   * goes through the proxy auth layer (token = `${proxy}/auth/token`, device =
   * the proxy's `/auth/device`). The proxy deliberately rewrites these
   * endpoints to itself; tokens minted straight from Keycloak skip the proxy
   * and are rejected by its fail-closed audience checks.
   *
   * Escape hatch: when `config.directKeycloak` is set (and realm + keycloakUrl
   * are known), build the canonical Keycloak endpoints directly and bypass the
   * proxy. This is opt-in only and should be reserved for debugging.
   */
  async resolveEndpoints(): Promise<AuthEndpoints> {
    if (this.endpoints) return this.endpoints

    // Escape hatch: explicit opt-in to talk to Keycloak directly.
    if (this.config.directKeycloak) {
      if (!this.config.realm || !this.config.keycloakUrl) {
        throw new CliError(
          'Direct-Keycloak mode requires both a realm and a Keycloak URL ' +
            `(set ${'PROXY_SMART_REALM'} and ${'PROXY_SMART_KEYCLOAK_URL'}, ` +
            'or --realm and --keycloak-url).',
        )
      }
      this.endpoints = keycloakEndpoints(this.config.keycloakUrl, this.config.realm)
      return this.endpoints
    }

    // Default: discover via the proxy's mirrored OIDC document so the CLI goes
    // through the proxy auth layer.
    const url = proxyDiscoveryUrl(this.config.url)
    const res = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    if (!res.ok) {
      throw new CliError(
        `Failed to discover OAuth endpoints from the proxy at ${url} (HTTP ${res.status}). ` +
          `Check ${'PROXY_SMART_URL'} (or --url) points at a running proxy.`,
      )
    }
    const meta = parseOidcMetadata(await res.json())
    this.endpoints = endpointsFromMetadata(meta)
    return this.endpoints
  }

  /**
   * Run the interactive device authorization flow and persist the result.
   * `prompt` is invoked once with the verification URL + user code.
   */
  async loginWithDeviceFlow(prompt: DevicePrompt): Promise<CachedToken> {
    const endpoints = await this.resolveEndpoints()
    if (!endpoints.deviceAuthorizationEndpoint) {
      throw new CliError(
        'The authorization server does not advertise a device authorization endpoint. ' +
          'Use client-credentials auth instead (set PROXY_SMART_CLIENT_SECRET).',
      )
    }

    const authRes = await this.fetchImpl(endpoints.deviceAuthorizationEndpoint, {
      method: 'POST',
      headers: FORM_HEADERS,
      body: deviceAuthBody(this.config.clientId, this.config.scope, this.config.clientSecret),
    })
    if (!authRes.ok) {
      throw new CliError(`Device authorization request failed (HTTP ${authRes.status}): ${await safeText(authRes)}`)
    }
    const device = parseDeviceAuthResponse(await authRes.json())
    prompt(device)

    const tokens = await this.pollForDeviceToken(endpoints.tokenEndpoint, device)
    const cached = toCachedToken(tokens, this.config.clientId)
    writeCachedToken(this.config.homeDir, cached)
    return cached
  }

  /** Run a client_credentials grant and persist the result. */
  async loginWithClientCredentials(): Promise<CachedToken> {
    if (!this.config.clientSecret) {
      throw new CliError('client_credentials login requires a client secret (PROXY_SMART_CLIENT_SECRET or --client-secret).')
    }
    const endpoints = await this.resolveEndpoints()
    const tokens = await this.exchange(
      endpoints.tokenEndpoint,
      clientCredentialsBody(this.config.clientId, this.config.clientSecret, this.config.scope),
    )
    const cached = toCachedToken(tokens, this.config.clientId)
    writeCachedToken(this.config.homeDir, cached)
    return cached
  }

  /**
   * Return a valid access token for API calls.
   *
   * Strategy:
   *   1. cached, still-fresh access token → use it
   *   2. cached refresh token still valid → refresh transparently
   *   3. client secret available → run client_credentials (CI ergonomics)
   *   4. otherwise → tell the user to `login`
   */
  async getAccessToken(): Promise<string> {
    const cached = readCachedToken(this.config.homeDir)

    if (cached && isTokenFresh(cached.expires_at)) {
      return cached.access_token
    }

    if (cached?.refresh_token && isTokenFresh(cached.refresh_expires_at)) {
      try {
        const endpoints = await this.resolveEndpoints()
        const tokens = await this.exchange(
          endpoints.tokenEndpoint,
          refreshTokenBody(cached.client_id, cached.refresh_token, this.config.clientSecret),
        )
        const refreshed = toCachedToken(tokens, cached.client_id)
        writeCachedToken(this.config.homeDir, refreshed)
        return refreshed.access_token
      } catch {
        // fall through to other strategies on refresh failure
      }
    }

    if (this.config.clientSecret) {
      const cc = await this.loginWithClientCredentials()
      return cc.access_token
    }

    throw new CliError('Not authenticated. Run `proxy-smart login` first.')
  }

  /** Forget any cached token. */
  logout(): void {
    clearTokenCache(this.config.homeDir)
  }

  /** Poll the token endpoint until the user approves the device, or it expires. */
  private async pollForDeviceToken(tokenEndpoint: string, device: DeviceAuthResponse): Promise<TokenSet> {
    const deadline = Date.now() + device.expires_in * 1000
    let intervalMs = (device.interval ?? 5) * 1000

    while (Date.now() < deadline) {
      await sleep(intervalMs)
      const res = await this.fetchImpl(tokenEndpoint, {
        method: 'POST',
        headers: FORM_HEADERS,
        body: deviceTokenBody(this.config.clientId, device.device_code, this.config.clientSecret),
      })
      const payload: unknown = await res.json()

      if (res.ok) return parseTokenSet(payload)

      const err = asTokenError(payload)
      if (err?.error === 'authorization_pending') continue
      if (err?.error === 'slow_down') {
        intervalMs += 5000
        continue
      }
      throw new CliError(`Device login failed: ${err?.error_description ?? err?.error ?? `HTTP ${res.status}`}`)
    }
    throw new CliError('Device login timed out before authorization was granted.')
  }

  /** POST a form body to a token endpoint and parse the token response. */
  private async exchange(tokenEndpoint: string, body: string): Promise<TokenSet> {
    const res = await this.fetchImpl(tokenEndpoint, { method: 'POST', headers: FORM_HEADERS, body })
    const payload: unknown = await res.json()
    if (!res.ok) {
      const err = asTokenError(payload)
      throw new CliError(`Token request failed: ${err?.error_description ?? err?.error ?? `HTTP ${res.status}`}`)
    }
    return parseTokenSet(payload)
  }
}

/** Read a response body as text, never throwing. */
async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).trim()
  } catch {
    return ''
  }
}

/** Promise-based delay. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
